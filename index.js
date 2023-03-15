const fs = require("fs");
const path = require("path");
const babelParser = require("@babel/parser");
const { transformFromAst } = require("@babel/core");
const traverse = require("@babel/traverse").default;

/**
 * @description 解析文件内容及其依赖
 * @param {string} file 文件路径
 * @returns {'dependencies': '文件依赖模块', 'code': '文件解析内容' }
 */
function explainFileContents(file) {
  // 读取入口文件内容
  const content = fs.readFileSync(file, "utf-8");

  //使用 @babel/parser（JavaScript解析器）解析代码，生成 ast（抽象语法树）
  const ast = babelParser.parse(content, {
    // sourceType 指示代码应解析的模式。可以是"script", "module"或 "unambiguous" 之一，其中  "unambiguous" 是让 @babel/parser 去猜测
    sourceType: "module",
  });

  //通过 @babel/core 的 transformFromAst 方法，来解析入口文件内容   ES6转成ES5
  const { code } = transformFromAst(ast, null, {
    presets: ["@babel/preset-env"],
  });

  // 通过 ast 获取所有的依赖模块，也就是我们需要获取 ast 中所有的 node.source.value ，也就是 import 模块的相对路径，通过这个相对路径可以寻找到依赖模块。
  /** 存放 ast 中解析出的所有依赖 */
  const dependencies = {};
  /**
 * 使用 @babel/traverse ，它和 babel 解析器配合使用，可以用来遍历及更新每一个子节点
traverse 函数是一个遍历 AST 的方法，由 babel-traverse 提供，他的遍历模式是经典的 visitor 模式 ，visitor 模式就是定义一系列的 visitor ，当碰到 AST 的 type === visitor 名字时，就会进入这个 visitor 的函数。类型为 ImportDeclaration 的 AST 节点，其实就是我们的 import xxx from xxxx，最后将地址 push 到 dependencies 中
 */
  traverse(ast, {
    // 遍历所有的 import 模块，并将相对路径放入 dependencies
    ImportDeclaration: ({ node }) => {
      const dirname = path.dirname(file);
      const abspath = "./" + path.join(dirname, node.source.value);

      dependencies[node.source.value] = abspath;
    },
  });
  const moduleInfo = { file, dependencies, code };
  return moduleInfo;
}
/**
 * 获取依赖
 * @param {*} queue
 * @param {*} param1
 */
function getDeps(queue, { dependencies }) {
  Object.keys(dependencies).forEach((key) => {
    const child = explainFileContents(dependencies[key]);
    queue.push(child);
    getDeps(queue, child);
  });
}
/**
 * 从入口文件开始，获取整个依赖图
 * @param {string} entry 入口文件
 */
function createDepenGraph(entry) {
  // 从入口文件开始，解析每一个依赖资源，并将其一次放入队列中
  const mainAssert = explainFileContents(entry);
  const queue = [mainAssert];
  const depsGraph = {};
  getDeps(queue, mainAssert);

  queue.forEach((moduleInfo) => {
    depsGraph[moduleInfo.file] = {
      dependencies: moduleInfo.dependencies,
      code: moduleInfo.code,
    };
  });
  return depsGraph;
}

function bundle(file) {
  const depsGraph = JSON.stringify(createDepenGraph(file));
  return `
  (function (graph) {
    function require(file) {
      function absRequire(relPath) {
        return require(graph[file].dependencies[relPath])
      }
      var exports = {};
      (function (require,exports,code) {
        eval(code)
      })(absRequire,exports,graph[file].code)
      
      return exports
    }
    require('${file}')
  }
  )(${depsGraph})`;
}

// 获取配置文件
const config = require("./minipack.config");
// 入口
const entry = config.entry;
// 出口
const output = config.output;

// 获取依赖图
// const graph = createDepenGraph(entry);

// console.log("====================================");
// console.log("content:", graph);
// console.log("====================================");

/**
 * 输出打包
 * @param {string} path 路径
 * @param {string} result 内容
 */
function writeFile(path, result) {
  // 写入 ./dist/bundle.js
  fs.writeFile(path, result, (err) => {
    if (err) throw err;
    console.log("文件已被保存");
  });
}

// 打包
const result = bundle(entry);

// 输出
fs.access(`${output.path}/${output.filename}`, (err) => {
  if (!err) {
    writeFile(`${output.path}/${output.filename}`, result);
  } else {
    fs.mkdir(output.path, { recursive: true }, (err) => {
      if (err) throw err;
      writeFile(`${output.path}/${output.filename}`, result);
    });
  }
});

/**
 * 
 bundle 函数原理参考这个：
 
 // index.js文件
var add = require('add.js').default
console.log(add(1 , 2))
// add.js 文件
exports.default = function(a,b) {return a + b}

1. 模拟exports对象
exports = {}
eval('exports.default = function(a,b) {return a + b}') // node⽂件读取后的代码字符串
exports.default(1,3)

2.个⾃运⾏函数来封装⼀下
var exports = {}
(function (exports, code) {
 eval(code)
})(exports, 'exports.default = function(a,b){return a + b}')

3.模拟require函数
function require(file) {
 var exports = {};
 (function (exports, code) {
 eval(code)
 })(exports, 'exports.default = function(a,b){return a + b}')
 return exports
}
var add = require('add.js').default
console.log(add(1 , 2))

4.完成了固定模块，我们下⾯只需要稍加改动，将所有模块的⽂件名和代码字符串整理为⼀张key-value表就可以根
据传⼊的⽂件名加载不同的模块了

(function (list) {
 function require(file) {
 var exports = {};
 (function (exports, code) {
 eval(code);
 })(exports, list[file]);
 return exports;
 }
 require("index.js");
})({
 "index.js": `
 var add = require('add.js').default
 console.log(add(1 , 2))
 `,
 "add.js": `exports.default = function(a,b){return a + b}`,
});


 */
