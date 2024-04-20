/* eslint indent: ["error", 2] */

module.exports = {
  default: function(_context) {
    return {
      plugin: function(markdownIt, _options) {
        markdownIt.core.ruler.push('sortableTable', state => {
          const tokens = state.tokens;
          for (let idx = 0; idx < tokens.length; idx += 1) {
            const token = tokens[idx];
            if (token.type !== 'table_open') {
              continue;
            }
            state.tokens[idx].attrJoin('class', 'sortable');
          }
        });
      },
      assets: function() {
        return [
          { name: 'sorttable.js' },
          { name: 'sorttable.css' },
        ];
      },
    };
  },
};
