/* eslint indent: ["error", 2] */

//
// Modified for Joplin
// Copyright (c) 2021 Hieu-Thi Luong
//
// Re-modified / cleaned up by Parker Sprouse, 2024
//

document.addEventListener('joplin-noteDidUpdate', () => {
  const doc_tables = Array.from(document.getElementsByTagName('table')).entries();
  for (const [index, table] of doc_tables) {
    if (table.classList.contains('sortable')) {
      sorttable.makeSortable(table, index);
    }
  }
});

function applySorting(table) {
  const sourceLine = parseInt(table.getAttribute('source-line'), 10);
  const rows = [];
  for (let i = 0; i < table.tBodies[0].rows.length; i += 1) {
    rows.push(parseInt(table.tBodies[0].rows[i].dataset.rowIdx, 10));
  }
  // eslint-disable-next-line no-undef
  webviewApi.postMessage('sortableMdTable', { 'source-line': sourceLine, 'rows': rows });
}

//
// SortTable
// version 2
// 7th April 2007
// Stuart Langridge, http://www.kryogenix.org/code/browser/sorttable/
//
// Instructions:
// Download this file
// Add <script src="sorttable.js"></script> to your HTML
// Add class="sortable" to any table you'd like to make sortable
// Click on the headers to sort
//
// Thanks to many, many people for contributions and suggestions.
// Licenced as X11: http://www.kryogenix.org/code/browser/licence.html
// This basically means: do what you want with it.
//

sorttable = {
  init: function() {
    // quit if this function has already been called
    if (arguments.callee.done) return;
    // flag this function so we don't do the same thing twice
    arguments.callee.done = true;

    if (!document.createElement || !document.getElementsByTagName) return;

    sorttable.DATE_RE = /^(\d\d?)[/.-](\d\d?)[/.-]((\d\d)?\d\d)$/;

    const doc_tables = Array.from(document.getElementsByTagName('table')).entries();
    for (const [index, table] of doc_tables) {
      if (table.classList.contains('sortable')) {
        sorttable.makeSortable(table, index);
      }
    }
  },

  makeSortable: function(table, tabIdx) {
    if (table.getElementsByTagName('thead').length === 0) {
      // table doesn't have a tHead. Since it should have, create one and put the first table row in it.
      const the = document.createElement('thead');
      the.appendChild(table.rows[0]);
      table.insertBefore(the, table.firstChild);
    }
    // Safari doesn't support table.tHead, sigh
    if (table.tHead === null) table.tHead = table.getElementsByTagName('thead')[0];

    if (table.tHead.rows.length !== 1) return; // can't cope with two header rows

    // ============================ //
    //  Joplin Feature: Apply Sort  //
    // ============================ //
    const tfoot = document.createElement('tfoot');
    const btnA = document.createElement('a');
    btnA.classList.add('sortable-apply');
    btnA.innerHTML = `
      <span title='Save Sorting' style='width: 18px; height: 18px;'>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5 5V19H19V7.82843L16.1716 5H5ZM4 3H17L20.7071 6.70711C20.8946 6.89464 21 7.149 21 7.41421V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM12 18C10.3431 18 9 16.6569 9 15C9 13.3431 10.3431 12 12 12C13.6569 12 15 13.3431 15 15C15 16.6569 13.6569 18 12 18ZM6 6H15V10H6V6Z"></path></svg>
      </span>
    `;
    btnA.href = '#';
    btnA.addEventListener('click', (e) => {
      e.preventDefault();
      applySorting(table);
    });
    tfoot.appendChild(btnA);
    table.appendChild(tfoot);
    // Mark each row with an index (ignore header)
    for (let i = 0; i < table.tBodies[0].rows.length; i += 1) {
      table.tBodies[0].rows[i].dataset.rowIdx = i;
    }

    // Sorttable v1 put rows with a class of "sortbottom" at the bottom (as
    // "total" rows, for example). This is B&R, since what you're supposed
    // to do is put them in a tfoot. So, if there are sortbottom rows,
    // for backwards compatibility, move them to tfoot (creating it if needed).
    // const sortbottomrows = [];
    // for (let i = 0; i < table.rows.length; i += 1) {
    //   if (table.rows[i].className.search(/\bsortbottom\b/) !== -1) {
    //     sortbottomrows[sortbottomrows.length] = table.rows[i];
    //   }
    // }
    // if (sortbottomrows) {
    //   if (table.tFoot === null) {
    //     // table doesn't have a tfoot. Create one.
    //     tfo = document.createElement('tfoot');
    //     table.appendChild(tfo);
    //   }
    //   for (let i = 0; i < sortbottomrows.length; i += 1) {
    //     tfo.appendChild(sortbottomrows[i]);
    //   }
    // }

    // work through each column and calculate its type
    const headrow = table.tHead.rows[0].cells;
    for (let i = 0; i < headrow.length; i += 1) {
      // manually override the type with a sorttable_type attribute
      if (!headrow[i].classList.contains('sorttable_nosort')) { // skip this col // .className.match(/\bsorttable_nosort\b/)
        const mtch = headrow[i].className.match(/\bsorttable_([a-z0-9]+)\b/);
        let override;
        if (mtch) { override = mtch[1]; }
        if (mtch && typeof sorttable[`sort_${override}`] === 'function') {
          headrow[i].sorttable_sortfunction = sorttable[`sort_${override}`];
        } else {
          headrow[i].sorttable_sortfunction = sorttable.guessType(table, i);
        }
        // make it clickable to sort
        headrow[i].sorttable_columnindex = i;
        headrow[i].sorttable_tbody = table.tBodies[0];
        dean_addEvent(headrow[i], 'click', sorttable.innerSortFunction = function(_e) {
          if (this.classList.contains('sorttable_sorted')) { // if (this.className.search(/\bsorttable_sorted\b/) !== -1) {
            // if we're already sorted by this column, just
            // reverse the table, which is quicker
            sorttable.reverse(this.sorttable_tbody);
            // this.className = this.className.replace('sorttable_sorted', 'sorttable_sorted_reverse');
            this.classList.replace('sorttable_sorted', 'sorttable_sorted_reverse');
            this.innerHTML = this.textContent;
            setTimeout(() => {
              this.innerHTML = `
                <div>
                  ${this.textContent}
                  <span id='${tabIdx}_sorttable_sortrevind'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"></path></svg>
                  </span>
                </div>
              `;
            }, 0);
            return;
          }
          if (this.classList.contains('sorttable_sorted_reverse')) { // if (this.className.search(/\bsorttable_sorted_reverse\b/) !== -1) {
            // if we're already sorted by this column in reverse, just re-reverse the table, which is quicker
            sorttable.reverse(this.sorttable_tbody);
            this.classList.replace('sorttable_sorted_reverse', 'sorttable_sorted'); // this.className = this.className.replace('sorttable_sorted_reverse', 'sorttable_sorted');
            this.innerHTML = this.textContent;
            setTimeout(() => {
              this.innerHTML = `
                <div>
                  ${this.textContent}
                  <span id='${tabIdx}_sorttable_sortfwdind'>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.9999 10.8284L7.0502 15.7782L5.63599 14.364L11.9999 8L18.3639 14.364L16.9497 15.7782L11.9999 10.8284Z"></path></svg>
                  </span>
                </div>
              `;
            }, 0);
            return;
          }

          // remove sorttable_sorted classes
          for (const cell of this.parentNode.childNodes) {
            if (cell.nodeType === 1) { // an element
              // cell.className = cell.className.replace('sorttable_sorted_reverse', '');
              // cell.className = cell.className.replace('sorttable_sorted', '');
              cell.classList.remove('sorttable_sorted_reverse', 'sorttable_sorted');
            }
          }

          const sortfwdind = document.getElementById(`${tabIdx}_sorttable_sortfwdind`);
          if (sortfwdind) sortfwdind.parentNode.removeChild(sortfwdind);
          const sortrevind = document.getElementById(`${tabIdx}_sorttable_sortrevind`);
          if (sortrevind) sortrevind.parentNode.removeChild(sortrevind);

          this.classList.add('sorttable_sorted'); // this.className += ' sorttable_sorted';
          this.innerHTML = `
            <div>
              ${this.textContent}
              <span id='${tabIdx}_sorttable_sortfwdind'>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M11.9999 10.8284L7.0502 15.7782L5.63599 14.364L11.9999 8L18.3639 14.364L16.9497 15.7782L11.9999 10.8284Z"></path></svg>
              </span>
            </div>
          `;

          // build an array to sort. This is a Schwartzian transform thing,
          // i.e., we "decorate" each row with the actual sort key,
          // sort based on the sort keys, and then put the rows back in order
          // which is a lot faster because you only do getInnerText once per row
          const row_array = [];
          const col = this.sorttable_columnindex;
          const rows = this.sorttable_tbody.rows;
          for (let j = 0; j < rows.length; j += 1) {
            row_array[row_array.length] = [sorttable.getInnerText(rows[j].cells[col]), rows[j]];
          }
          /* If you want a stable sort, uncomment the following line */
          // sorttable.shaker_sort(row_array, this.sorttable_sortfunction);
          /* and comment out this one */
          row_array.sort(this.sorttable_sortfunction);

          const tb = this.sorttable_tbody;
          for (let j = 0; j < row_array.length; j += 1) {
            tb.appendChild(row_array[j][1]);
          }
        });
      }
    }
  },

  guessType: function(table, column) {
    // guess the type of a column based on its first non-blank row
    let sortfn = sorttable.sort_alpha;
    for (let i = 0; i < table.tBodies[0].rows.length; i += 1) {
      const text = sorttable.getInnerText(table.tBodies[0].rows[i].cells[column]);
      if (text !== '') {
        if (text.match(/^-?[£$¤]?[\d,.]+%?$/)) return sorttable.sort_numeric;

        // check for a date: dd/mm/yyyy or dd/mm/yy
        // can have / or . or - as separator
        // can be mm/dd as well
        const possdate = text.match(sorttable.DATE_RE);
        if (possdate) {
          // looks like a date
          const first = parseInt(possdate[1], 10);
          const second = parseInt(possdate[2], 10);
          if (first > 12) return sorttable.sort_ddmm; // definitely dd/mm
          else if (second > 12) return sorttable.sort_mmdd;
          // looks like a date, but we can't tell which, so assume
          // that it's dd/mm (English imperialism!) and keep looking
          else sortfn = sorttable.sort_ddmm;
        }
      }
    }
    return sortfn;
  },

  getInnerText: function(node) {
    // gets the text we want to use for sorting for a cell.
    // strips leading and trailing whitespace.
    // this is *not* a generic getInnerText function; it's special to sorttable.
    // for example, you can override the cell text with a customkey attribute.
    // it also gets .value for <input> fields.

    if (!node) return '';
    const hasInputs = (typeof node.getElementsByTagName === 'function') && node.getElementsByTagName('input').length;

    if (node.getAttribute('sorttable_customkey') !== null) {
      return node.getAttribute('sorttable_customkey');
    } else if (typeof node.textContent !== 'undefined' && !hasInputs) {
      return node.textContent.replace(/^\s+|\s+$/g, '');
    } else if (typeof node.innerText !== 'undefined' && !hasInputs) {
      return node.innerText.replace(/^\s+|\s+$/g, '');
    } else if (typeof node.text !== 'undefined' && !hasInputs) {
      return node.text.replace(/^\s+|\s+$/g, '');
    } else {
      switch (node.nodeType) {
      case 3:
        if (node.nodeName.toLowerCase() === 'input') return node.value.replace(/^\s+|\s+$/g, '');
        break;
      case 4:
        return node.nodeValue.replace(/^\s+|\s+$/g, '');
      case 1:
      case 11: {
        let innerText = '';
        for (let i = 0; i < node.childNodes.length; i += 1) innerText += sorttable.getInnerText(node.childNodes[i]);
        return innerText.replace(/^\s+|\s+$/g, '');
      }
      default:
        return '';
      }
    }
  },

  // reverse the rows in a tbody
  reverse: function(tbody) {
    const newrows = [];
    for (let i = 0; i < tbody.rows.length; i += 1) newrows[newrows.length] = tbody.rows[i];
    for (let i = newrows.length - 1; i >= 0; i -= 1) tbody.appendChild(newrows[i]);
  },

  // sort functions
  // each sort function takes two parameters, a and b
  // you are comparing a[0] and b[0]
  sort_numeric: function(a, b) {
    const aa = parseFloat(a[0].replace(/[^0-9.-]/g, '')) || 0;
    const bb = parseFloat(b[0].replace(/[^0-9.-]/g, '')) || 0;
    return aa - bb;
  },

  sort_alpha: function(a, b) {
    if (a[0].toLowerCase() === b[0].toLowerCase()) return 0;
    if (a[0].toLowerCase() < b[0].toLowerCase()) return -1;
    return 1;
  },

  sort_ddmm: function(a, b) {
    let mtch = a[0].match(sorttable.DATE_RE);
    let d = mtch[1] && mtch[1].padStart(2, '0');
    let m = mtch[2] && mtch[2].padStart(2, '0');
    let y = mtch[3];
    const dt1 = `${y}${m}${d}`;
    mtch = b[0].match(sorttable.DATE_RE);
    d = mtch[1] && mtch[1].padStart(2, '0');
    m = mtch[2] && mtch[2].padStart(2, '0');
    y = mtch[3];
    const dt2 = `${y}${m}${d}`;
    if (dt1 === dt2) return 0;
    if (dt1 < dt2) return -1;
    return 1;
  },

  sort_mmdd: function(a, b) {
    let mtch = a[0].match(sorttable.DATE_RE);
    let m = mtch[1] && mtch[1].padStart(2, '0');
    let d = mtch[2] && mtch[2].padStart(2, '0');
    let y = mtch[3];
    const dt1 = `${y}${m}${d}`;
    mtch = b[0].match(sorttable.DATE_RE);
    m = mtch[1] && mtch[1].padStart(2, '0');
    d = mtch[2] && mtch[2].padStart(2, '0');
    y = mtch[3];
    const dt2 = `${y}${m}${d}`;
    if (dt1 === dt2) return 0;
    if (dt1 < dt2) return -1;
    return 1;
  },

  // A stable sort function to allow multi-level sorting of data
  // see: http://en.wikipedia.org/wiki/Cocktail_sort
  // thanks to Joseph Nahmias
  shaker_sort: function(list, comp_func) {
    let b = 0;
    let t = list.length - 1;
    let swap = true;

    while (swap) {
      swap = false;
      for (let i = b; i < t; ++i) {
        if (comp_func(list[i], list[i + 1]) > 0) {
          const q = list[i];
          list[i] = list[i + 1];
          list[i + 1] = q;
          swap = true;
        }
      }
      t -= 1;

      if (!swap) break;

      for (let i = t; i > b; --i) {
        if (comp_func(list[i], list[i - 1]) < 0) {
          const q = list[i];
          list[i] = list[i - 1];
          list[i - 1] = q;
          swap = true;
        }
      }
      b += 1;
    }
  },
};

// *****************************************************************
// Supporting functions: bundled here to avoid depending on a library
// ******************************************************************

// Dean Edwards/Matthias Miller/John Resig

/* for Mozilla/Opera9 */
if (document.addEventListener) {
  document.addEventListener('DOMContentLoaded', sorttable.init, false);
}

/* for other browsers */
window.onload = sorttable.init;

// written by Dean Edwards, 2005
// with input from Tino Zijdel, Matthias Miller, Diego Perini

// http://dean.edwards.name/weblog/2005/10/add-event/

function dean_addEvent(element, type, handler) {
  if (element.addEventListener) {
    element.addEventListener(type, handler, false);
  } else {
    // assign each event handler a unique ID
    if (!handler.$$guid) handler.$$guid = dean_addEvent.guid += 1;
    // create a hash table of event types for the element
    if (!element.events) element.events = {};
    // create a hash table of event handlers for each element/event pair
    let handlers = element.events[type];
    if (!handlers) {
      handlers = element.events[type] = {};
      // store the existing event handler (if there is one)
      if (element[`on${type}`]) handlers[0] = element[`on${type}`];
    }
    // store the event handler in the hash table
    handlers[handler.$$guid] = handler;
    // assign a global event handler to do all the work
    element[`on${type}`] = handleEvent;
  }
}
// a counter used to create unique IDs
dean_addEvent.guid = 1;

// function removeEvent(element, type, handler) {
//   if (element.removeEventListener) {
//     element.removeEventListener(type, handler, false);
//   } else {
//     // delete the event handler from the hash table
//     if (element.events && element.events[type]) {
//       delete element.events[type][handler.$$guid];
//     }
//   }
// }

function handleEvent(event) {
  let returnValue = true;
  // grab the event object (IE uses a global event object)
  event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);
  // get a reference to the hash table of event handlers
  const handlers = this.events[event.type];
  // execute each event handler
  for (const i in handlers) {
    this.$$handleEvent = handlers[i];
    if (this.$$handleEvent(event) === false) {
      returnValue = false;
    }
  }
  return returnValue;
}

function fixEvent(event) {
  // add W3C standard event methods
  event.preventDefault = fixEvent.preventDefault;
  event.stopPropagation = fixEvent.stopPropagation;
  return event;
}

fixEvent.preventDefault = function() {
  this.returnValue = false;
};

fixEvent.stopPropagation = function() {
  this.cancelBubble = true;
};

// Dean's forEach: http://dean.edwards.name/base/forEach.js
//
// forEach, version 1.0
// Copyright 2006, Dean Edwards
// License: http://www.opensource.org/licenses/mit-license.php
//

// generic enumeration
Function.prototype.forEach = function(object, block, context) {
  for (const key in object) {
    if (typeof this.prototype[key] === 'undefined') {
      block.call(context, object[key], key, object);
    }
  }
};

// character enumeration
String.forEach = function(string, block, context) {
  for (const [char, index] of string.split('').entries()) {
    block.call(context, char, index, string);
  }
};

// globally resolve forEach enumeration
// const forEach = function(object, block, context) {
//   if (object) {
//     let resolve = Object; // default
//     if (object instanceof Function) {
//       // functions have a "length" property
//       resolve = Function;
//     } else if (object.forEach instanceof Function) {
//       // the object implements a custom forEach method so use that
//       object.forEach(block, context);
//       return;
//     } else if (typeof object === 'string') {
//       // the object is a string
//       resolve = String;
//     } else if (typeof object.length === 'number') {
//       // the object is array-like
//       resolve = Array;
//     }
//     resolve.forEach(object, block, context);
//   }
// };
