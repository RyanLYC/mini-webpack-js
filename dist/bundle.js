(function (graph) {
  function require(file) {
    function absRequire(relPath) {
      return require(graph[file].dependencies[relPath]);
    }
    var exports = {};
    (function (require, exports, code) {
      eval(code);
    })(absRequire, exports, graph[file].code);

    return exports;
  }
  debugger;
  require("src/entry.js");
})({
  "src/entry.js": {
    dependencies: {
      "./message.js": "./src\\message.js",
      "./name.js": "./src\\name.js",
    },
    code: '"use strict";\n\nvar _message = _interopRequireDefault(require("./message.js"));\nvar _name = require("./name.js");\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }\n(0, _message["default"])();\nconsole.log(\'----name-----: \', _name.name);',
  },
  "./src\\message.js": {
    dependencies: {
      "./hello.js": "./src\\hello.js",
      "./name.js": "./src\\name.js",
    },
    code: '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\nexports["default"] = message;\nvar _hello = require("./hello.js");\nvar _name = require("./name.js");\nfunction message() {\n  console.log("".concat(_hello.hello, " ").concat(_name.name, "!"));\n}',
  },
  "./src\\hello.js": {
    dependencies: {},
    code: '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\nexports.hello = void 0;\nvar hello = \'hello\';\nexports.hello = hello;',
  },
  "./src\\name.js": {
    dependencies: {},
    code: '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\nexports.name = void 0;\nvar name = "lyc";\nexports.name = name;',
  },
});
