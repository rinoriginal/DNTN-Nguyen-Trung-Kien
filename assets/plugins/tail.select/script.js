/*
 |  tail.select - Another solution to make select fields beautiful again!
 |  @file       ./js/tail.select.js
 |  @author     SamBrishes <sam@pytes.net>
 |  @version    0.5.10 - Beta
 |
 |  @website    https://github.com/pytesNET/tail.select
 |  @license    X11 / MIT License
 |  @copyright  Copyright © 2014 - 2019 SamBrishes, pytesNET <info@pytes.net>
 */
;(function(factory){
    if(typeof(define) == "function" && define.amd){
        define(function(){ return factory(window); });
    } else {
        if(typeof(window.tail) == "undefined"){
            window.tail = {};
        }
        window.tail.select = factory(window);

        if(typeof(jQuery) != "undefined"){
            jQuery.fn.tailselect = function(o){
                var r = [], i;
                this.each(function(){ if((i = tail.select(this, o)) !== false){ r.push(i); } });
                return (r.length === 1)? r[0]: (r.length === 0)? false: r;
            }
        }
        if(typeof(MooTools) != "undefined"){
            Element.implement({ tailselect: function(o){ return new tail.select(this, o); } });
        }
    }
}(function(root){
    "use strict";
    var w = root, d = root.document;

    // Internal Helper Methods
    function cHAS(e, name){
        return (new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)")).test((e.className || ""));
    }
    function cADD(e, name){
        if(!(new RegExp("(?:^|\\s+)" + name + "(?:\\s+|$)")).test(e.className || name)){
            e.className += " " + name;
        }
        return e;
    }
    function cREM(e, name, regex){
        if((regex = new RegExp("(?:^|\\s+)(" + name + ")(?:\\s+|$)")) && regex.test(e.className || "")){
            e.className = e.className.replace(regex, "");
        }
        return e;
    }
    function trigger(e, event, opt){
        if(CustomEvent && CustomEvent.name){
            var ev = new CustomEvent(event, opt);
        } else {
            var ev = d.createEvent("CustomEvent");
            ev.initCustomEvent(event, !!opt.bubbles, !!opt.cancelable, opt.detail);
        }
        return e.dispatchEvent(ev);
    }
    function clone(obj, rep){
        if(Object.assign){
            return Object.assign({}, obj, rep || {});
        }
        var clone = new Object();
        for(var key in obj){
            clone[key] = (key in rep)? rep[key]: obj[key];
        }
        return clone;
    }
    function create(tag, classes){
        var r = d.createElement(tag);
            r.className = (classes && classes.join)? classes.join(" "): classes || "";
        return r;
    }

    /*
     |  SELECT CONSTRUCTOR
     |  @version    0.5.0 [0.3.0]
     */
    var tailSelect = function(el, config){
        el = (typeof(el) == "string")? d.querySelectorAll(el): el;
        if(el instanceof NodeList || el instanceof HTMLCollection || el instanceof Array){
            for(var _r = [], l = el.length, i = 0; i < l; i++){
                _r.push(new tailSelect(el[i], clone(config, {})));
            }
            return (_r.length === 1)? _r[0]: ((_r.length === 0)? false: _r);
        }
        if(!(el instanceof Element) || !(this instanceof tailSelect)){
            return !(el instanceof Element)? false: new tailSelect(el, config);
        }

        // Check Element
        if(tailSelect.inst[el.getAttribute("data-tail-select")]){
            return tailSelect.inst[el.getAttribute("data-tail-select")];
        }
        if(el.getAttribute("data-select")){
            var test = JSON.parse(el.getAttribute("data-select").replace(/\'/g, '"'));
            if(test instanceof Object){
                config = clone(config, test); // This is a unofficial function ;3
            }
        }

        // Get Element Options
        var placeholder = el.getAttribute("placeholder") || el.getAttribute("data-placeholder"),
            fb1 = "bindSourceSelect", fb2 = "sourceHide"; // Fallbacks
        config = (typeof(config) == "object")? config: {};
        config.multiple = ("multiple" in config)? config.multiple: el.multiple;
        config.disabled = ("disabled" in config)? config.disabled: el.disabled;
        config.placeholder = placeholder || config.placeholder || null;
        config.width = (config.width === "auto")? el.offsetWidth + 50: config.width;
        config.sourceBind = (fb1 in config)? config[fb1]: config.sourceBind || false;
        config.sourceHide = (fb2 in config)? config[fb2]: config.sourceHide || true;
        config.multiLimit = (config.multiLimit >= 0)? config.multiLimit: Infinity;

        // Init Instance
        this.e = el;
        this.id = ++tailSelect.count;
        this.con = clone(tailSelect.defaults, config);
        this.events = {};
        tailSelect.inst["tail-" + this.id] = this;
        return this.init().bind();
    }, tailOptions;
    tailSelect.version = "0.5.10";
    tailSelect.status = "beta";
    tailSelect.count = 0;
    tailSelect.inst = {};

    /*
     |  STORAGE :: DEFAULT OPTIONS
     */
    tailSelect.defaults = {
        animate: true,
        classNames: null,
        csvOutput: false,
        csvSeparator: ",",
        descriptions: false,
        deselect: false,
        disabled: false,
        height: 350,
        hideDisabled: false,
        hideSelected: false,
        items: {},
        locale: "en",
        linguisticRules: {
            "ё": "е"
        },
        multiple: false,
        multiLimit: Infinity,
        multiPinSelected: false,
        multiContainer: false,
        multiShowCount: true,
        multiShowLimit: false,
        multiSelectAll: false,
        multiSelectGroup: true,
        openAbove: null,
        placeholder: null,
        search: false,
        searchFocus: true,
        searchMarked: true,
        searchDisabled: true,
        sortItems: false,
        sortGroups: false,
        sourceBind: false,
        sourceHide: true,
        startOpen: false,
        stayOpen: false,
        width: null,
        cbComplete: undefined,
        cbEmpty: undefined,
        cbLoopItem: undefined,
        cbLoopGroup: undefined
    };

    /*
     |  STORAGE :: STRINGS
     */
    tailSelect.strings = {
        en: {
            all: "All",
            none: "None",
            actionAll: "Select All",
            actionNone: "Unselect All",
            empty: "No Options available",
            emptySearch: "No Options found",
            limit: "You can't select more Options",
            placeholder: "Select an Option...",
            placeholderMulti: "Select up to :limit Options...",
            search: "Type in to search...",
            disabled: "This Field is disabled"
        },
        modify: function(locale, id, string){
            if(!(locale in this)){
                return false;
            }
            if((id instanceof Object)){
                for(var key in id){
                    this.modify(locale, key, id[key]);
                }
            } else {
                this[locale][id] = (typeof(string) == "string")? string: this[locale][id];
            }
            return true;
        },
        register: function(locale, object){
            if(typeof(locale) != "string" || !(object instanceof Object)){
                return false;
            }
            this[locale] = object;
            return true;
        }
    };

    /*
     |  TAIL.SELECT HANDLER
     */
    tailSelect.prototype = {
        /*
         |  INERNAL :: TRANSLATE
         |  @version    0.5.8 [0.5.8]
         */
        _e: function(string, replace, def){
            if(!(string in this.__)){
                return (!def)? string: def;
            }

            var string = this.__[string];
            if(typeof(string) === "function"){
                string = string.call(this, replace);
            }
            if(typeof(replace) === "object"){
                for(var key in replace){
                    string = string.replace(key, replace[key]);
                }
            }
            return string;
        },

        /*
         |  INTERNAL :: INIT SELECT FIELD
         |  @version    0.5.8 [0.3.0]
         */
        init: function(){
            var self = this, classes = ["tail-select"], con = this.con,
                regexp = /^[0-9.]+(?:cm|mm|in|px|pt|pc|em|ex|ch|rem|vw|vh|vmin|vmax|\%)$/i;

            // Init ClassNames
            var c = (con.classNames === true)? this.e.className: con.classNames;
            classes.push((c && c.push)? c.join(" "): (c && c.split)? c: "no-classes");
            if(con.hideSelected){    classes.push("hide-selected"); }
            if(con.hideDisabled){    classes.push("hide-disabled"); }
            if(con.multiLimit == 0){ classes.push("disabled");      }
            if(con.multiple){        classes.push("multiple");      }
            if(con.deselect){        classes.push("deselect");      }
            if(con.disabled){        classes.push("disabled");      }

            // Init Variables
            this.__ = clone(tailSelect.strings.en, tailSelect.strings[con.locale] || {});
            this._init = true;
            this._query = false;
            this.select = create("DIV", classes);
            this.label = create("DIV", "select-label");
            this.dropdown = create("DIV", "select-dropdown");
            this.search = create("DIV", "dropdown-search");
            this.csvInput = create("INPUT", "select-search");

            // Build :: Select
            if(con.width && regexp.test(con.width)){
                this.select.style.width = con.width;
            } else if(con.width && !isNaN(parseFloat(con.width, 10))){
                this.select.style.width = con.width + "px";
            }

            // Build :: Label
            this.label.addEventListener("click", function(event){
                self.toggle.call(self, self.con.animate);
            });
            this.select.appendChild(this.label);

            // Build :: Dropdown
            if(!isNaN(parseInt(con.height, 10))){
                this.dropdown.style.maxHeight = parseInt(con.height, 10) + "px";
            }
            if(con.search){
                this.search.innerHTML = '<input type="text" class="search-input" />';
                this.search.children[0].placeholder = this._e("search");
                this.search.children[0].addEventListener("input", function(event){
                    self.query.call(self, (this.value.length > 2)? this.value: undefined);
                });
                this.dropdown.appendChild(this.search);
            }
            this.select.appendChild(this.dropdown);

            // Build :: CSV Input
            this.csvInput.type = "hidden";
            if(con.csvOutput){
                this.csvInput.name = this.e.name;
                this.e.removeAttribute("name");
                this.select.appendChild(this.csvInput);
            }

            // Prepare Container
            if(con.multiple && con.multiContainer){
                if(d.querySelector(con.multiContainer)){
                    this.container = d.querySelector(con.multiContainer);
                    this.container.className += " tail-select-container";
                } else if(con.multiContainer === true){
                    this.container = this.label;
                    this.container.className += " tail-select-container";
                }
            }

            // Prepare Options
            this.options = new tailOptions(this.e, this);
            for(var l = this.e.options.length, i = 0; i < l; i++){
                this.options.set(this.e.options[i], false);
            }
            for(var key in con.items){
                if(typeof(con.items[key]) == "string"){
                    con.items[key] = {value: con.items[key]};
                }
                this.options.add(con.items[key].key || key, con.items[key].value,
                    con.items[key].group, con.items[key].selected,
                    con.items[key].disabled, con.items[key].description);
            }
            this.query();

            // Append and Return
            if(this.e.nextElementSibling){
                this.e.parentElement.insertBefore(this.select, this.e.nextElementSibling);
            } else {
                this.e.parentElement.appendChild(this.select);
            }
            if(con.sourceHide){
                if(this.e.style.display == "none"){
                    this.select.style.display = "none";
                    this.e.setAttribute("data-select-hidden", "display");
                } else if(this.e.style.visibility == "hidden"){
                    this.select.style.visibiltiy = "hidden";
                    this.e.setAttribute("data-select-hidden", "visibility");
                } else {
                    this.e.style.display = "none";
                    this.e.setAttribute("data-select-hidden", "0");
                }
            }
            this.e.setAttribute("data-tail-select", "tail-" + this.id);
            if(self.con.startOpen){
                this.open(con.animate);
            }
            (con.cbComplete || function(){ }).call(this, this.select);
            return (this._init = false)? this: this;
        },

        /*
         |  INTERNAL :: EVENT LISTENER
         |  @version    0.5.3 [0.3.0]
         */
        bind: function(){
            var self = this;

            // Keys Listener
            d.addEventListener("keydown", function(event){
                var key = (event.keyCode || event.which), opt, inner, e, temp;
                if(!cHAS(self.select, "active") || [13, 27, 38, 40].indexOf(key) < 0){
                    return false;
                }
                event.preventDefault();
                event.stopPropagation();

                // Enter || Escape
                if(key == 13){
                    if((opt = self.dropdown.querySelector(".dropdown-option.hover:not(.disabled)"))){
                        self.options.select.call(self.options, opt);
                    }
                }
                if(key == 27 || key == 13){
                    return self.close(self.con.animate);
                }

                // Top || Down
                if((opt = self.dropdown.querySelector(".dropdown-option.hover:not(.disabled)"))){
                    cREM(opt, "hover"); e = [((key == 40)? "next": "previous") + "ElementSibling"];
                    do {
                        if((temp = opt[e]) !== null && opt.tagName == "LI"){
                            opt = temp;
                        } else if((temp = opt.parentElement[e]) !== null && temp.children.length > 0 && temp.tagName == "UL"){
                            opt = temp.children[(key == 40)? 0: temp.children.length-1];
                        } else {
                            opt = false;
                        }
                        if(opt && (!cHAS(opt, "dropdown-option") || cHAS(opt, "disabled"))){
                            continue;
                        }
                        break;
                    } while(true);
                }
                if(!opt && key == 40){
                    opt = self.dropdown.querySelector(".dropdown-option:not(.disabled)");
                } else if(!opt && key == 38){
                    opt = self.dropdown.querySelector("ul:last-child li:not(.disabled):last-child");
                }
                if(opt && (inner = self.dropdown.querySelector(".dropdown-inner"))){
                    var pos = (function(el){
                        var _r = {top: el.offsetTop, height: el.offsetHeight};
                        while((el = el.parentElement) != inner){
                            _r.top += el.offsetTop;
                        }
                        return _r;
                    })(opt);
                    cADD(opt, "hover");
                    if((pos.top+(pos.height*2)) > (inner.offsetHeight+inner.scrollTop)){
                        inner.scrollBy(0, (pos.top+(pos.height*2))-(inner.offsetHeight+inner.scrollTop));
                    } else if((pos.top-pos.height) < inner.scrollTop){
                        inner.scrollBy(0, -Math.abs(inner.scrollTop-pos.top+pos.height));
                    }
                }
                return true;
            });

            // Close
            d.addEventListener("click", function(ev){
                if(!cHAS(self.select, "active") || cHAS(self.select, "idle")){ return false; }
                if(self.con.stayOpen === true){ return false; }

                var targets = [self.e, self.select, self.container];
                for(var l = targets.length, i = 0; i < l; i++){
                    if(targets[i] && (targets[i].contains(ev.target) || targets[i] == ev.target)){
                        return false;
                    }
                    if(!ev.target.parentElement){ return false; }
                }
                return self.close.call(self, self.con.animate);
            });

            // Bind Source Select
            if(!this.con.sourceBind){
                return true;
            }
            this.e.addEventListener("change", function(event){
                if(event.detail != undefined){
                    return false;
                }
                event.preventDefault();
                event.stopPropagation();
                if(!this.multiple && this.selectedIndex){
                    self.options.select.call(self.options, this.options[this.selectedIndex]);
                } else {
                    var u = [].concat(self.options.selected);
                    var s = [].filter.call(this.querySelectorAll("option:checked"), function(item){
                        if(u.indexOf(item) >= 0){
                            u.splice(u.indexOf(item), 1);
                            return false;
                        }
                        return true;
                    });
                    self.options.walk.call(self.options, "unselect", u);
                    self.options.walk.call(self.options, "select", s);
                }
            });
            return true;
        },

        /*
         |  INTERNAL :: INTERNAL CALLBACK
         |  @version    0.5.0 [0.3.0]
         */
        callback: function(item, state, _force){
            var self = this, s = "[data-key='" + item.key + "'][data-group='" + item.group + "']";
            if(state == "rebuild"){ return this.query(); }

            // Set Element-Item States
            var element = this.dropdown.querySelector(s);
            if(element && ["select", "disable"].indexOf(state) >= 0){
                cADD(element, (state == "select"? "selected": "disabled"));
            } else if(element && ["unselect", "enable"].indexOf(state) >= 0){
                cREM(element, (state == "unselect"? "selected": "disabled"));
            }

            // Handle
            this.update(item);
            return (_force === true)? true: this.trigger("change", item, state);
        },

        /*
         |  INTERNAL :: TRIGGER EVENT HANDLER
         |  @version    0.5.2 [0.4.0]
         */
        trigger: function(event){
            if(this._init){ return false; }
            var obj = {bubbles: false, cancelable: true, detail: {args: arguments, self: this}};
            if(event == "change" && arguments[2] && arguments[2].indexOf("select") >= 0){
                trigger(this.e, "input", obj);
                trigger(this.e, "change", obj);
            }
            trigger(this.select, "tail::" + event, obj);

            var args = [], pass;
            Array.prototype.map.call(arguments, function(item, i){
                if(i > 0){ args.push(item); }
            });
            (this.events[event] || []).forEach(function(item){
                pass = [].concat(args);
                pass.push(item.args || null);
                (item.cb || function(){ }).apply(obj.detail.self, pass);
            });
            return true;
        },

        /*
         |  INTERNAL :: CALCULATE DROPDOWN
         |  @version    0.5.4 [0.5.0]
         */
        calc: function(){
            var clone = this.dropdown.cloneNode(true), height = this.con.height, search = 0,
                inner = this.dropdown.querySelector(".dropdown-inner");

            // Calculate Dropdown Height
            clone = this.dropdown.cloneNode(true);
            clone.style.cssText = "height:auto;min-height:auto;max-height:none;opacity:0;display:block;visibility:hidden;";
            clone.style.maxHeight = this.con.height + "px";
            clone.className += " cloned";
            this.dropdown.parentElement.appendChild(clone);
            height = (height > clone.clientHeight)? clone.clientHeight: height;
            if(this.con.search){
                search = clone.querySelector(".dropdown-search").clientHeight;
            }
            this.dropdown.parentElement.removeChild(clone);

            // Calculate Viewport
            var pos = this.select.getBoundingClientRect(),
                bottom = w.innerHeight-(pos.top+pos.height),
                view = ((height+search) > bottom)? pos.top > bottom: false;
            if(this.con.openAbove === true || (this.con.openAbove !== false && view)){
                view = true, height = Math.min((height), pos.top-10);
                cADD(this.select, "open-top");
            } else {
                view = false, height = Math.min((height), bottom-10);
                cREM(this.select, "open-top");
            }
            if(inner){
                this.dropdown.style.maxHeight = height + "px";
                inner.style.maxHeight = (height-search) + "px";
            }
            return this;
        },

        /*
         |  API :: QUERY OPTIONS
         |  @version    0.5.9 [0.5.0]
         */
        query: function(search, conf){
            var root = create("DIV", "dropdown-inner"), self = this, item, tp, ul, li, a1, a2,
                func = search? "finder": "walker", con = this.con, g = "getAttribute";

            // Format Search
            if(typeof(search) === "string" && search.length > 0){
                for(var key in con.linguisticRules){
                    var re = new RegExp("(" + key + "|" + con.linguisticRules[key] + ")", "ig");
                    search = search.replace(re, "(" + key + "|" + con.linguisticRules[key] + ")");
                }
            }
            var args = search? [search, conf]: [con.sortItems, con.sortGroups];

            // Option Walker
            this._query = (typeof(search) == "string")? search: false;
            while(item = this.options[func].apply(this.options, args)){
                if(!ul || (ul && ul[g]("data-group") !== item.group)){
                    tp = (con.cbLoopGroup || this.cbGroup).call(this, item.group, search, root);
                    if(tp instanceof Element){
                        ul = tp;
                        ul.setAttribute("data-group", item.group);
                        root.appendChild(ul);
                    } else { break; }
                }

                // Create Item
                if((li = (con.cbLoopItem || this.cbItem).call(this, item, ul, search, root)) === null){
                    continue;
                }
                if(li === false){ break; }
                li.setAttribute("data-key", item.key);
                li.setAttribute("data-group", item.group);
                li.addEventListener("click", function(event){
                    if(!this.hasAttribute("data-key")){ return false; }
                    var key = this[g]("data-key"), group = this[g]("data-group") || "#";
                    if(self.options.toggle.call(self.options, key, group)){
                        if(self.con.stayOpen === false && !self.con.multiple){
                            self.close.call(self, self.con.animate);
                        }
                    }
                });
                ul.appendChild(li);
            }

            // Empty
            var count = root.querySelectorAll("*[data-key]").length;
            if(count == 0){
                (this.con.cbEmpty || function(element){
                    var li = create("SPAN", "dropdown-empty");
                    li.innerText = this._e("empty");
                    element.appendChild(li);
                }).call(this, root, search);
            }

            // Select All
            if(count > 0 && con.multiple && con.multiLimit == Infinity && con.multiSelectAll){
                a1 = create("BUTTON", "tail-all"), a2 = create("BUTTON", "tail-none");
                a1.innerText = this._e("actionAll");
                a1.addEventListener("click", function(event){
                    event.preventDefault();
                    var options = self.dropdown.querySelectorAll(".dropdown-inner .dropdown-option");
                    self.options.walk.call(self.options, "select", options);
                })
                a2.innerText = this._e("actionNone");
                a2.addEventListener("click", function(event){
                    event.preventDefault();
                    var options = self.dropdown.querySelectorAll(".dropdown-inner .dropdown-option");
                    self.options.walk.call(self.options, "unselect", options);
                })

                // Add Element
                li = create("SPAN", "dropdown-action");
                li.appendChild(a1);
                li.appendChild(a2);
                root.insertBefore(li, root.children[0]);
            }

            // Add and Return
            var data = this.dropdown.querySelector(".dropdown-inner");
            this.dropdown[(data? "replace": "append") + "Child"](root, data);
            if(cHAS(this.select, "active")){
                this.calc();
            }
            return this.updateCSV().updateLabel();
        },

        /*
         |  API :: CALLBACK -> CREATE GROUP
         |  @version    0.5.8 [0.4.0]
         */
        cbGroup: function(group, search){
            var ul = create("UL", "dropdown-optgroup"), self = this, a1, a2;
            if(group == "#"){ return ul; }
            ul.innerHTML = '<li class="optgroup-title"><b>' + group + '</b></li>';
            if(this.con.multiple && this.con.multiLimit == Infinity && this.con.multiSelectAll){
                a1 = create("BUTTON", "tail-none"), a2 = create("BUTTON", "tail-all");
                a1.innerText = this._e("none");
                a1.addEventListener("click", function(event){
                    event.preventDefault();
                    var grp = this.parentElement.parentElement.getAttribute("data-group");
                    self.options.all.call(self.options, "unselect", grp);
                });
                a2.innerText = this._e("all");
                a2.addEventListener("click", function(event){
                    event.preventDefault();
                    var grp = this.parentElement.parentElement.getAttribute("data-group");
                    self.options.all.call(self.options, "select", grp);
                });
                ul.children[0].appendChild(a1);
                ul.children[0].appendChild(a2);
            }
            return ul;
        },

        /*
         |  API :: CALLBACK -> CREATE ITEM
         |  @version    0.5.0 [0.4.0]
         */
        cbItem: function(item, optgroup, search){
            var li = create("LI", "dropdown-option" + (item.selected? " selected": "") + (item.disabled? " disabled": ""));

            // Inner Text
            if(search && search.length > 0 && this.con.searchMarked){
                li.innerHTML = item.value.replace(new RegExp("(" + search + ")", "i"), "<mark>$1</mark>");
            } else {
                li.innerText = item.value;
            }

            // Inner Description
            if(this.con.descriptions && item.description){
                li.innerHTML += '<span class="option-description">' + item.description + '</span>';
            }
            return li;
        },

        /*
         |  API :: UPDATE EVERYTHING
         |  @version    0.5.0 [0.5.0]
         */
        update: function(item){
            return this.updateLabel().updateContainer(item).updatePin(item).updateCSV(item);
        },

        /*
         |  API :: UPDATE LABEL
         |  @version    0.5.8 [0.5.0]
         */
        updateLabel: function(label){
            if(this.container == this.label && this.options.selected.length > 0){
                if(this.label.querySelector(".label-inner")){
                    this.label.removeChild(this.label.querySelector(".label-inner"));
                }
                if(this.label.querySelector(".label-count")){
                    this.label.removeChild(this.label.querySelector(".label-count"));
                }
                return this;
            }
            var c = this.con, len = this.options.selected.length, limit;
            if(typeof(label) != "string"){
                if(c.disabled){
                    label = "disabled";
                } else if(this.dropdown.querySelectorAll("*[data-key]").length == 0){
                    label = "empty" + (cHAS(this.select, "in-search")? "Search": "");
                } else if(c.multiLimit <= len){
                    label = "limit";
                } else if(!c.multiple && this.options.selected.length > 0){
                    label = this.options.selected[0].innerText;
                } else if(typeof(c.placeholder) == "string"){
                    label = c.placeholder;
                } else {
                    label = "placeholder" + (c.multiple && c.multiLimit < Infinity? "Multi": "");
                }
            }

            // Set HTML
            label = this._e(label, {":limit": c.multiLimit}, label);
            label = '<span class="label-inner">' + label + '</span>',
            limit = (c.multiShowLimit && c.multiLimit < Infinity);
            if(c.multiple && c.multiShowCount){
                label = '<span class="label-count">:c</span>' + label;
                label = label.replace(":c", len + (limit? (" / " + c.multiLimit): ""));
            }
            this.label.innerHTML = label;
            return this;
        },

        /*
         |  API :: UPDATE CONTAINER
         |  @version    0.5.0 [0.5.0]
         */
        updateContainer: function(item){
            if(!this.container || !this.con.multiContainer){
                return this;
            }
            var s = "[data-group='" + item.group + "'][data-key='" + item.key + "']";
            if(this.container.querySelector(s)){
                if(!item.selected){
                    this.container.removeChild(this.container.querySelector(s));
                }
                return this;
            }

            // Create Item
            if(item.selected){
                var self = this, hndl = create("DIV", "select-handle");
                hndl.innerText = item.value;
                hndl.setAttribute("data-key", item.key);
                hndl.setAttribute("data-group", item.group);
                hndl.addEventListener("click", function(event){
                    event.preventDefault();
                    event.stopPropagation();
                    var key = this.getAttribute("data-key"), grp = this.getAttribute("data-group");
                    self.options.unselect.call(self.options, key, grp);
                });
                this.container.appendChild(hndl);
            }
            return this;
        },

        /*
         |  API :: UPDATE PIN POSITION
         |  @version    0.5.3 [0.5.0]
         */
        updatePin: function(item){
            var inner = this.dropdown.querySelector(".dropdown-inner ul"),
                option = "li[data-key='" + item.key + "'][data-group='" + item.group + "']";
            if(!this.con.multiPinSelected || !inner || this._query !== false){
                return this;
            }

            // Create Item
            option = this.dropdown.querySelector(option);
            if(item.selected){
                inner.insertBefore(option, inner.children[0]);
            } else {
                var grp = this.dropdown.querySelector("ul[data-group='" + item.group + "']"),
                    prev = this.options[item.index-1], found = false;
                while(prev && prev.group == item.group){
                    if(found = grp.querySelector("li[data-key='" + prev.key + "']")){
                        break;
                    }
                    prev = this.options[prev.index-1];
                }
                if(found && found.nextElementSibling){
                    grp.insertBefore(option, found.nextElementSibling);
                } else {
                    grp.appendChild(option);
                }
            }
            return this;
        },

        /*
         |  API :: UPDATE CSV INPUT
         |  @version    0.5.0 [0.5.0]
         */
        updateCSV: function(item){
            if(!this.csvInput || !this.con.csvOutput){
                return this;
            }
            for(var selected = [], l = this.options.selected.length, i = 0; i < l; i++){
                selected.push(this.options.selected[i].value);
            }
            this.csvInput.value = selected.join(this.con.csvSeparator || ",");
            return this;
        },

        /*
         |  PUBLIC :: OPEN DROPDOWN
         |  @version    0.5.0 [0.3.0]
         */
        open: function(animate){
            if(cHAS(this.select, "active") || cHAS(this.select, "idle") || this.con.disabled){
                return false;
            }
            this.calc();

            // Final Function
            var final = function(){
                cADD(cREM(self.select, "idle"), "active");
                this.dropdown.style.height = "auto";
                this.dropdown.style.overflow = "visible";
                this.label.removeAttribute("style");
                if(this.con.search && this.con.searchFocus){
                    this.dropdown.querySelector("input").focus();
                }
                this.trigger.call(this, "open");
            }, self = this, e = this.dropdown.style;

            // Open
            if(animate !== false){
                this.label.style.zIndex = 25;
                this.dropdown.style.cssText += "height:0;display:block;overflow:hidden;";
                cADD(self.select, "idle");
                (function animate(){
                    var h = parseInt(e.height, 10), m = parseInt(e.maxHeight, 10);
                    if(h >= m){
                        return final.call(self);
                    }
                    e.height = ((h+50 > m)? m: h+50) + "px";
                    setTimeout(animate, 20);
                })();
            } else {
                e.cssText = "height:" + e.maxHeight + ";display:block;overflow:hidden;";
                final.call(this);
            }
            return this;
        },

        /*
         |  PUBLIC :: CLOSE DROPDOWN
         |  @version    0.5.0 [0.3.0]
         */
        close: function(animate){
            if(!cHAS(this.select, "active") || cHAS(this.select, "idle")){
                return false;
            }
            var final = function(){
                cREM(cREM(this.select, "idle"), "active");
                this.dropdown.removeAttribute("style");
                this.dropdown.querySelector(".dropdown-inner").removeAttribute("style");
                this.trigger.call(this, "close");
            }, self = this, e = this.dropdown;

            // Close
            if(animate !== false){
                cADD(this.select, "idle");
                this.dropdown.style.overflow = "hidden";
                (function animate(){
                    if((parseInt(e.offsetHeight, 10)-50) <= 0){
                        return final.call(self);
                    }
                    e.style.height = (parseInt(e.offsetHeight, 10)-50) + "px";
                    setTimeout(animate, 20);
                })();
            } else {
                final.call(this);
            }
            return this;
        },

        /*
         |  PUBLIC :: TOGGLE DROPDOWN
         |  @version    0.5.0 [0.3.0]
         */
        toggle: function(animate){
            if(cHAS(this.select, "active")){
                return this.close(animate);
            }
            return !cHAS(this.select, "idle")? this.open(animate): this;
        },

        /*
         |  PUBLIC :: REMOVE SELECT
         |  @version    0.5.3 [0.3.0]
         */
        remove: function(){
            this.e.removeAttribute("data-tail-select");
            if(this.e.hasAttribute("data-select-hidden")){
                if(this.e.getAttribute("data-select-hidden") == "0"){
                    this.e.style.removeProperty("display");
                }
                this.e.removeAttribute("data-select-hidden");
            }
            Array.prototype.map.call(this.e.querySelectorAll("[data-select-option='add']"), function(item){
                item.parentElement.removeChild(item);
            })
            Array.prototype.map.call(this.e.querySelectorAll("[data-select-optgroup='add']"), function(item){
                item.parentElement.removeChild(item);
            })
            this.e.name = (this.csvInput.hasAttribute("name"))? this.csvInput.name: this.e.name;
            if(this.select.parentElement){
                this.select.parentElement.removeChild(this.select);
            }
            if(this.container){
                var handles = this.container.querySelectorAll(".select-handle");
                for(var l = handles.length, i = 0; i < l; i++){
                    this.container.removeChild(handles[i]);
                }
            }
            return this;
        },

        /*
         |  PUBLIC :: RELOAD SELECT
         |  @version    0.5.0 [0.3.0]
         */
        reload: function(){
            return this.remove().init();
        },

        /*
         |  PUBLIC :: GET|SET CONFIG
         |  @version    0.5.3 [0.4.0]
         */
        config: function(key, value, rebuild){
            if(key instanceof Object){
                for(var k in key){ this.config(k, key[k], false); }
                return this.reload()? this.con: this.con;
            }
            if(typeof(key) == "undefined"){
                return this.con;
            } else if(!(key in this.con)){
                return false;
            }

            // Set | Return
            if(typeof(value) == "undefined"){
                return this.con[key];
            }
            this.con[key] = value;
            if(this.rebuild !== false){
                this.reload();
            }
            return this;
        },
        enable: function(update){
            cREM(this.select, "disabled");
            this.e.disabled = false;
            this.con.disabled = false;
            return (update === false)? this: this.reload();
        },
        disable: function(update){
            cADD(this.select, "disabled");
            this.e.disabled = true;
            this.con.disabled = true;
            return (update === false)? this: this.reload();
        },

        /*
         |  PUBLIC :: CUSTOM EVENT LISTENER
         |  @version    0.5.0 [0.4.0]
         |
         |  @param  string  'open', 'close', 'change'
         |  @param  callb.  A custom callback function.
         |  @param  array   An array with own arguments, which should pass to the callback too.
         */
        on: function(event, callback, args){
            if(["open", "close", "change"].indexOf(event) < 0 || typeof(callback) != "function"){
                return false;
            }
            if(!(event in this.events)){
                this.events[event] = [];
            }
            this.events[event].push({cb: callback, args: (args instanceof Array)? args: []});
            return this;
        }
    };

    /*
     |  OPTIONS CONSTRUCTOR
     |  @version    0.5.0 [0.3.0]
     */
    tailOptions = tailSelect.options = function(select, parent){
        if(!(this instanceof tailOptions)){
            return new tailOptions(select, parent);
        }
        this.self = parent;
        this.element = select;
        this.length = 0;
        this.selected = [];
        this.disabled = [];
        this.items = {"#": {}};
        this.groups = {};
        return this;
    }

    /*
     |  TAIL.OPTIONS HANDLER
     */
    tailOptions.prototype = {
        /*
         |  INTERNAL :: REPLACE TYPOs
         |  @version    0.5.0 [0.3.0]
         */
        _r: function(state){
            return state.replace("disabled", "disable").replace("enabled", "enable")
                        .replace("selected", "select").replace("unselected", "unselect");
        },

        /*
         |  GET AN EXISTING OPTION
         |  @version    0.5.7 [0.3.0]
         */
        get: function(key, grp){
            var g = "getAttribute";
            if(typeof(key) == "object" && key.key && key.group){
                grp = key.group || grp;
                key = key.key;
            } else if(key instanceof Element){
                if(key.tagName == "OPTION"){
                    grp = key.parentElement.label || "#";
                    key = key.value || key.innerText;
                } else if(key.hasAttribute("data-key")){
                    grp = key[g]("data-group") || key.parentElement[g]("data-group") || "#";
                    key = key[g]("data-key");
                }
            } else if(typeof(key) != "string"){
                return false;
            }
            key = (/^[0-9]+$/.test(key))? "_" + key: key;
            return (grp in this.items)? this.items[grp][key]: false;
        },

        /*
         |  SET AN EXISTING OPTION
         |  @version    0.5.7 [0.3.0]
         */
        set: function(opt, rebuild){
            var key = opt.value || opt.innerText, grp = opt.parentElement.label || "#";
            if(!(grp in this.items)){
                this.items[grp] = {};
                this.groups[grp] = opt.parentElement;
            }
            if(key in this.items[grp]){
                return false;
            }
            var id = (/^[0-9]+$/.test(key))? "_" + key: key;

            // Validate Selection
            var con = this.self.con, s = (!con.multiple && this.selected.length > 0);
            if(s || (con.multiple && this.selected.length >= con.multiLimit)){
                opt.selected = false;
            }
            if(opt.selected && con.deselect && (!opt.hasAttribute("selected") || con.multiLimit == 0)){
                opt.selected = false;
                opt.parentElement.selectedIndex = -1;
            }

            // Sanitize Description
            if(opt.hasAttribute("data-description")){
                var span = create("SPAN");
                    span.innerHTML = opt.getAttribute("data-description");
                opt.setAttribute("data-description", span.innerHTML);
            }

            // Add Item
            this.items[grp][id] = {
                key: key,
                value: opt.text,
                description: opt.getAttribute("data-description") || null,
                group: grp,
                option: opt,
                optgroup: (grp != "#")? this.groups[grp]: undefined,
                selected: opt.selected,
                disabled: opt.disabled
            };
            this.length++;
            if(opt.selected){ this.select(this.items[grp][id]); }
            if(opt.disabled){ this.disable(this.items[grp][id]); }
            return (rebuild)? this.self.callback(this[this.length-1], "rebuild"): true;
        },

        /*
         |  CREATE A NEW OPTION
         |  @version    0.5.3 [0.3.0]
         */
        add: function(key, value, group, selected, disabled, description, rebuild){
            if(key instanceof Object){
                for(var k in key){
                    this.add(key[k].key || k, key[k].value, key[k].group, key[k].selected, key[k].disabled, key[k].description, false);
                }
                return this.self.query();
            }
            if(this.get(key, group)){
                return false;
            }

            // Check Group
            group = (typeof(group) == "string")? group: "#";
            if(group !== "#" && !(group in this.groups)){
                var optgroup = create("OPTGROUP");
                optgroup.label = group;
                optgroup.setAttribute("data-select-optgroup", "add");
                this.element.appendChild(optgroup);
                this.items[group] = {};
                this.groups[group] = optgroup;
            }

            // Validate Selection
            var con = this.self.con, s = (!con.multiple && this.selected.length > 0);
            if(s || (con.multiple && this.selected.length >= con.multiLimit)){
                selected = false;
            }
            disabled = !!disabled;

            // Create Option
            var option = d.createElement("OPTION");
            option.value = key;
            option.selected = selected;
            option.disabled = disabled;
            option.innerText = value;
            option.setAttribute("data-select-option", "add");
            if(description && description.length > 0){
                option.setAttribute("data-description", description);
            }

            // Add Option and Return
            ((group == "#")? this.element: this.groups[group]).appendChild(option);
            return this.set(option, rebuild);
        },

        /*
         |  MOVE AN EXISTING OPTION
         |  @version    0.5.0 [0.5.0]
         */
        move: function(item, group, new_group, rebuild){
            if(!(item = this.get(item, group))){ return false; }

            // Create Group
            if(new_group !== "#" && !(new_group in this.groups)){
                var optgroup = create("OPTGROUP");
                optgroup.label = new_group;
                this.element.appendChild(optgroup);
                this.items[new_group] = {};
                this.groups[new_group] = optgroup;
                this.groups[new_group].appendChild(item.option);
            }

            // Move To Group
            delete this.items[item.group][item.key];
            item.group = new_group;
            item.optgroup = this.groups[new_group] || undefined;
            this.items[new_group][item.key] = item;
            return (rebuild)? this.self.query(): true;
        },

        /*
         |  REMOVE AN EXISTING OPTION
         |  @version    0.5.7 [0.3.0]
         */
        remove: function(item, group, rebuild){
            if(!(item = this.get(item, group))){ return false; }
            if(item.selected){ this.unselect(item); }
            if(item.disabled){ this.enable(item); }

            // Remove Data
            item.option.parentElement.removeChild(item.option);
            var id = (/^[0-9]+$/.test(item.key))? "_" + item.key: item.key;
            delete this.items[item.group][id];
            this.length--;

            // Remove Optgroup
            if(Object.keys(this.items[item.group]).length === 0){
                delete this.items[item.group];
                delete this.groups[item.group];
            }
            return (rebuild)? this.self.query(): true;
        },

        /*
         |  CHECK AN EXISTING OPTION
         |  @version    0.5.0 [0.3.0]
         */
        is: function(state, key, group){
            var state = this._r(state), item = this.get(key, group);
            if(!item || ["select", "unselect", "disable", "enable"].indexOf(state) < 0){
                return null;
            }
            if(state == "disable" || state == "enable"){
                return (state == "disable")? item.disabled: !item.disabled;
            } else if(state == "select" || state == "unselect"){
                return (state == "select")? item.selected: !item.selected;
            }
            return false;
        },

        /*
         |  INTERACT WITH AN OPTION
         |  @version    0.5.3 [0.3.0]
         */
        handle: function(state, key, group, _force){
            var item = this.get(key, group), state = this._r(state);
            if(!item || ["select", "unselect", "disable", "enable"].indexOf(state) < 0){
                return null;
            }

            // Disable || Enable
            if(state == "disable" || state == "enable"){
                if(!(item.option in this.disabled) && state == "disable"){
                    this.disabled.push(item.option);
                } else if((item.option in this.disabled) && state == "enable"){
                    this.disabled.splice(this.disabled.indexOf(item.option), 1);
                }
                item.disabled = (state == "disable");
                item.option.disabled = (state == "disable");
                return this.self.callback.call(this.self, item, state);
            }

            // Select || Unselect
            var dis = (cHAS(this.self.select, "disabled") || item.disabled || item.option.disabled),
                lmt = (this.self.con.multiple && this.self.con.multiLimit <= this.selected.length),
                sgl = (!this.self.con.multiple && this.selected.indexOf(item.option) > 0),
                del = (this.self.con.multiLimit == 0 && this.self.con.deselect == true),
                uns = (!this.self.con.multiple && !this.self.con.deselect && _force !== true);
            if(state == "select"){
                if(dis || lmt || del || sgl){
                    return false;
                }
                if(!this.self.con.multiple){
                    for(var i in this.selected){
                        this.unselect(this.selected[i], undefined, true);
                    }
                }
                if(this.selected.indexOf(item.option) < 0){
                    this.selected.push(item.option);
                }
            } else if(state == "unselect"){
                if(dis || uns){
                    return false;
                }
                this.selected.splice(this.selected.indexOf(item.option), 1);
            }
            item.selected = (state == "select");
            item.option.selected = (state == "select");
            item.option[(state.length > 6? "remove": "set") + "Attribute"]("selected", "selected");
            return this.self.callback.call(this.self, item, state, _force);
        },
        enable: function(key, group){
            return this.handle("enable", key, group, false);
        },
        disable: function(key, group){
            return this.handle("disable", key, group, false);
        },
        select: function(key, group){
            return this.handle("select", key, group, false);
        },
        unselect: function(key, group, _force){
            return this.handle("unselect", key, group, _force);
        },
        toggle: function(item, group){
            if(!(item = this.get(item, group))){ return false; }
            return this.handle((item.selected? "unselect": "select"), item, group, false);
        },

        /*
         |  INVERT CURRENT <STATE>
         |  @version    0.5.0 [0.3.0]
         */
        invert: function(state){
            state = this._replaceType(state);
            if(["enable", "disable"].indexOf(state) >= 0){
                var invert = this.disabled, action = (state == "enable")? "disable": "enable";
            } else if(["select", "unselect"].indexOf(state) >= 0){
                var invert = this.selected, action = (state == "select")? "unselect": "select";
            }
            var convert = Array.prototype.filter.call(this, function(element){
                return !(element in invert);
            }), self = this;

            // Loop
            [].concat(invert).forEach(function(item){
                self.handle.call(self, action, item);
            });
            [].concat(convert).forEach(function(item){
                self.handle.call(self, state, item);
            });
            return true;
        },

        /*
         |  SET <STATE> ON ALL OPTIONs
         |  @version    0.5.0 [0.5.0]
         */
        all: function(state, group){
            var self = this, list = this;
            if(group in this.items){
                list = Object.keys(this.items[group]);
            } else if(["unselect", "enable"].indexOf(state) >= 0){
                list = [].concat((state == "unselect")? this.selected: this.disabled);
            }
            Array.prototype.forEach.call(list, function(item){
                self.handle.call(self, state, item, group, false);
            });
            return true;
        },

        /*
         |  SET <STATE> FOR A BUNCH OF OPTIONs
         |  @version    0.5.4 [0.5.3]
         */
        walk: function(state, items, args){
            if(items instanceof Array || items.length){
                for(var l = items.length, i = 0; i < l; i++){
                    this.handle.apply(this, [state, items[i], null].concat(args));
                }
            } else if(items instanceof Object){
                var self = this;
                if(items.forEach){
                    items.forEach(function(value){
                        self.handle.apply(self, [state, value, null].concat(args));
                    });
                } else {
                    for(var key in items){
                        if(typeof(items[key]) != "string" && typeof(items[key]) != "number" && !(items[key] instanceof Element)){
                            continue;
                        }
                        this.handle.apply(this, [state, items[key], (key in this.items? key: null)]).concat(args);
                    }
                }
            }
            return this;
        },

        /*
         |  FIND SOME OPTIONs - ARRAY EDITION
         |  @version    0.5.5 [0.3.0]
         */
        find: function(search, config){
            var regex = new RegExp(search, "im"), filter = [], self = this,
                filterKey = function(option){ return regex.test(option.text || option.value); },
                filterAny = function(option){
                    return (
                        regex.test(option.text) || regex.test(option.value) ||
                        Array.apply(null, option.attributes).filter(filterKey).length > 0
                    );
                };
            Array.apply(null, this.self.e.options).map(function(option){
                if(!((config == "any")? filterAny(option): filterKey(option))){
                    return false;
                }
                if(self.disabled.indexOf(option) >= 0 && !self.self.con.searchDisabled){
                    return false;
                }
                filter.push(self.get(option));
            });
            return filter;
        },

        /*
         |  FIND SOME OPTIONs - WALKER EDITION
         |  @version    0.5.5 [0.3.0]
         */
        finder: function(search, config){
            if(this._finderLoop === undefined){
                this._finderLoop = this.find(search, config);
            }
            var item;
            while((item = this._finderLoop.shift()) !== undefined){
                return item;
            }
            delete this._finderLoop;
            return false;
        },

        /*
         |  NEW OPTIONS WALKER
         |  @version    0.5.7 [0.4.0]
         */
        walker: function(orderi, orderg){
            if(typeof(this._inLoop) != "undefined" && this._inLoop){
                if(this._inItems.length > 0){
                    var key = this._inItems.shift();
                    return this.items[this._inGroup][key];
                }

                // Sort Items
                if(this._inGroups.length > 0){
                    while(this._inGroups.length > 0){
                        var group = this._inGroups.shift();
                        if(!(group in this.items)){
                            return false;
                        }

                        var keys = Object.keys(this.items[group]);
                        if(keys.length > 0){
                            break;
                        }
                    }
                    if(orderi == "ASC"){
                        keys.sort();
                    } else if(orderi == "DESC"){
                        keys.sort().reverse();
                    } else if(typeof(orderi) == "function"){
                        keys = orderi.call(this, keys);
                    }
                    this._inItems = keys;
                    this._inGroup = group;
                    return this.walker(null, null);
                }

                // Delete and Exit
                delete this._inLoop;
                delete this._inItems;
                delete this._inGroup;
                delete this._inGroups;
                return false;
            }

            // Sort Groups
            var groups = Object.keys(this.groups) || [];
            if(orderg == "ASC"){
                groups.sort();
            } else if(orderg == "DESC"){
                groups.sort().reverse();
            } else if(typeof(orderg) == "function"){
                groups = orderg.call(this, groups);
            }
            groups.unshift("#");

            // Init Loop
            this._inLoop = true;
            this._inItems = [];
            this._inGroups = groups;
            return this.walker(orderi, null);
        }
    };

    // Return
    return tailSelect;
}));
