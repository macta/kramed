var _utils = require('./utils');
var escape = _utils.escape;
var unescape = _utils.unescape;

/**
 * Renderer
 */

var defaultOptions = {
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  headerAutoId: true,
  xhtml: false,
};

function Renderer(options) {
  this.options = options || defaultOptions;
}

function extractIdTag(text) {
  var id = /({:\s*\#)(.+)(})/g.exec(text);
  return id? id[2] : null;
}

function extractClassTag(text) {
    return /(\S\s*\{)(:\s*\.)(.+)(})/gm.exec(text);
}

function extractClassTagNotAfter(text, str) {
  var style = extractClassTag(text);
  var regex = new RegExp(str);

  if(style && !(regex.test(style[1]))) {
    return style[3];
  }
  return null;
}

function extractClassTagAfter(text, str) {
    var style = extractClassTag(text);
    var regex = new RegExp(str);
    if(style && regex.test(style[1])) {
        return style[3];
    }
    return null;
}

function textWithoutUserTags(text) {
  var result = text.replace(/{#.+}/g, '');
  return result.replace(/{:.+}/g, '');
}


function idTag(id) {
   return id? ' id="' + id + '"' : '';
}

function classTag(id) {
   return id? ' class="' + id + '"' : '';
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype._createId = function(str) {
  // replace " " and all punctuation characters to "-"
  str = str.toLowerCase().replace(/[\s\]\[\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\`\{\|\}\~\-]+/g, '-');
  try {
    str = encodeURIComponent(str);
  } catch (e) {
    str = str.replace(/[^\w]+/g, '-');
  }
  return str.replace(/-$/, '');
};

Renderer.prototype.heading = function(text, level, raw) {
  var id = extractIdTag(raw);

  if (!id && this.options.headerAutoId !== false) id = this._createId(raw)

  return '<h'
    + level
    + idTag(id)
    + '>'
    + textWithoutUserTags(text)
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';

  var id = extractIdTag(body);
  var classTagStr = extractClassTagAfter(body, ".*\\n\{");


  return '<' 
    + type 
    + idTag(id)
    + classTag(classTagStr)
    + '>\n' 
    + textWithoutUserTags(body)
    + '</' 
    + type 
    + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  var classTagStr = extractClassTagNotAfter(text,">\\s*\{");

  var newText = text.replace(/\\\n/g, '<br/>');

  return '<p '
      + classTag(classTagStr)
      + '>'
      + textWithoutUserTags(newText)
      + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

Renderer.prototype.math = function(content, language, display) {
  mode = display ? '; mode=display' : '';
  return '<script type="' + language + mode + '">' + content + '</script>';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.reffn = function(refname) {
  return '<sup><a href="#fn_' + refname + '" id="reffn_' + refname + '">' + refname + '</a></sup>'
};

Renderer.prototype.footnote = function(refname, text) {
  return '<blockquote id="fn_' + refname + '">\n'
    + '<sup>' + refname + '</sup>. '
    + text
    + '<a href="#reffn_' + refname + '" title="Jump back to footnote [' + refname + '] in the text."> &#8617;</a>\n'
    + '</blockquote>\n';
};


Renderer.prototype.link = function(href, title, text, raw) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text, raw) {
  var classTagStr = extractClassTagAfter(raw, "\\)\\s*\{");
  var out = '<img src="' + href + '" alt="' + text + '"';

  if (title) {
    out += ' title="' + title + '"';
  }

  if (classTagStr) {
    out += ' class="' + classTagStr + '"';
  }

  out += this.options.xhtml ? '/>' : '>';
  return out;
};

module.exports = Renderer;
