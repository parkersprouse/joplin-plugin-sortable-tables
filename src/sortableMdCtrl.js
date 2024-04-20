/* eslint indent: ["error", 2] */

function plugin(CodeMirror) {
  CodeMirror.defineExtension('sortableApply', function(message) {
    const sourceLine = message['source-line'];
    const rows = message['rows'];
    const maxIdx = Math.max(...rows);
    if (maxIdx + 1 !== rows.length) { return; }
    let sorted = `${this.getLine(sourceLine)}\n${this.getLine(sourceLine + 1)}\n`;
    for (let i = 0; i <= maxIdx; i++) {
      sorted = `${sorted + this.getLine(sourceLine + 2 + rows[i])}\n`;
    }
    this.setSelection(CodeMirror.Pos(sourceLine, 0), CodeMirror.Pos(sourceLine + 3 + maxIdx, 0));
    this.replaceSelection(sorted, 'around');
  });
}

module.exports = {
  default: function(_context) {
    return {
      plugin: plugin,
      codeMirrorResources: [],
      codeMirrorOptions: {},
      assets: function() {
        return [];
      },
    };
  },
};
