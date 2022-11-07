
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.52.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Calendar.svelte generated by Svelte v3.52.0 */

    const { console: console_1 } = globals;
    const file$2 = "src\\Calendar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    // (70:3) {:else}
    function create_else_block(ctx) {
    	let li;
    	let t0_value = /*i*/ ctx[15] - /*firstDayIndex*/ ctx[4] + 1 + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(li, "class", "svelte-brjaat");
    			toggle_class(li, "active", /*i*/ ctx[15] === /*today*/ ctx[6].dayNumber + (/*firstDayIndex*/ ctx[4] - 1) && /*monthIndex*/ ctx[0] === /*today*/ ctx[6].month && /*year*/ ctx[1] === /*today*/ ctx[6].year);
    			add_location(li, file$2, 71, 4, 1848);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t0);
    			append_dev(li, t1);

    			if (!mounted) {
    				dispose = listen_dev(li, "click", /*click_handler*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*firstDayIndex*/ 16 && t0_value !== (t0_value = /*i*/ ctx[15] - /*firstDayIndex*/ ctx[4] + 1 + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*today, firstDayIndex, monthIndex, year*/ 83) {
    				toggle_class(li, "active", /*i*/ ctx[15] === /*today*/ ctx[6].dayNumber + (/*firstDayIndex*/ ctx[4] - 1) && /*monthIndex*/ ctx[0] === /*today*/ ctx[6].month && /*year*/ ctx[1] === /*today*/ ctx[6].year);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(70:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (68:3) {#if i < firstDayIndex || i>= numberOfDays+firstDayIndex}
    function create_if_block$1(ctx) {
    	let li;

    	const block = {
    		c: function create() {
    			li = element("li");
    			li.textContent = " ";
    			attr_dev(li, "class", "svelte-brjaat");
    			add_location(li, file$2, 68, 5, 1753);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(68:3) {#if i < firstDayIndex || i>= numberOfDays+firstDayIndex}",
    		ctx
    	});

    	return block;
    }

    // (67:2) {#each Array(calendarCellsQsty) as _, i}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*i*/ ctx[15] < /*firstDayIndex*/ ctx[4] || /*i*/ ctx[15] >= /*numberOfDays*/ ctx[3] + /*firstDayIndex*/ ctx[4]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(67:2) {#each Array(calendarCellsQsty) as _, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let ul0;
    	let li0;
    	let t1;
    	let li1;
    	let t3;
    	let li2;
    	let t4;
    	let br;
    	let t5;
    	let span;
    	let t6;
    	let t7;
    	let ul1;
    	let li3;
    	let t9;
    	let li4;
    	let t11;
    	let li5;
    	let t13;
    	let li6;
    	let t15;
    	let li7;
    	let t17;
    	let li8;
    	let t19;
    	let li9;
    	let t21;
    	let ul2;
    	let mounted;
    	let dispose;
    	let each_value = Array(/*calendarCellsQsty*/ ctx[5]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "❮";
    			t1 = space();
    			li1 = element("li");
    			li1.textContent = "❯";
    			t3 = space();
    			li2 = element("li");
    			t4 = text(/*month*/ ctx[2]);
    			br = element("br");
    			t5 = space();
    			span = element("span");
    			t6 = text(/*year*/ ctx[1]);
    			t7 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			li3.textContent = "일";
    			t9 = space();
    			li4 = element("li");
    			li4.textContent = "월";
    			t11 = space();
    			li5 = element("li");
    			li5.textContent = "화";
    			t13 = space();
    			li6 = element("li");
    			li6.textContent = "수";
    			t15 = space();
    			li7 = element("li");
    			li7.textContent = "목";
    			t17 = space();
    			li8 = element("li");
    			li8.textContent = "금";
    			t19 = space();
    			li9 = element("li");
    			li9.textContent = "토";
    			t21 = space();
    			ul2 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(li0, "class", "prev svelte-brjaat");
    			add_location(li0, file$2, 46, 3, 1214);
    			attr_dev(li1, "class", "next svelte-brjaat");
    			add_location(li1, file$2, 48, 3, 1335);
    			add_location(br, file$2, 49, 14, 1406);
    			set_style(span, "font-size", "18px");
    			add_location(span, file$2, 50, 4, 1416);
    			attr_dev(li2, "class", "svelte-brjaat");
    			add_location(li2, file$2, 49, 3, 1395);
    			attr_dev(ul0, "class", "svelte-brjaat");
    			add_location(ul0, file$2, 44, 2, 1144);
    			attr_dev(div, "class", "month svelte-brjaat");
    			add_location(div, file$2, 43, 1, 1121);
    			attr_dev(li3, "class", "svelte-brjaat");
    			add_location(li3, file$2, 56, 2, 1516);
    			attr_dev(li4, "class", "svelte-brjaat");
    			add_location(li4, file$2, 57, 2, 1530);
    			attr_dev(li5, "class", "svelte-brjaat");
    			add_location(li5, file$2, 58, 2, 1544);
    			attr_dev(li6, "class", "svelte-brjaat");
    			add_location(li6, file$2, 59, 2, 1558);
    			attr_dev(li7, "class", "svelte-brjaat");
    			add_location(li7, file$2, 60, 2, 1572);
    			attr_dev(li8, "class", "svelte-brjaat");
    			add_location(li8, file$2, 61, 2, 1586);
    			attr_dev(li9, "class", "svelte-brjaat");
    			add_location(li9, file$2, 62, 2, 1600);
    			attr_dev(ul1, "class", "weekdays svelte-brjaat");
    			add_location(ul1, file$2, 55, 1, 1491);
    			attr_dev(ul2, "class", "days svelte-brjaat");
    			add_location(ul2, file$2, 65, 1, 1623);
    			attr_dev(main, "class", "svelte-brjaat");
    			add_location(main, file$2, 42, 0, 1112);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t1);
    			append_dev(ul0, li1);
    			append_dev(ul0, t3);
    			append_dev(ul0, li2);
    			append_dev(li2, t4);
    			append_dev(li2, br);
    			append_dev(li2, t5);
    			append_dev(li2, span);
    			append_dev(span, t6);
    			append_dev(main, t7);
    			append_dev(main, ul1);
    			append_dev(ul1, li3);
    			append_dev(ul1, t9);
    			append_dev(ul1, li4);
    			append_dev(ul1, t11);
    			append_dev(ul1, li5);
    			append_dev(ul1, t13);
    			append_dev(ul1, li6);
    			append_dev(ul1, t15);
    			append_dev(ul1, li7);
    			append_dev(ul1, t17);
    			append_dev(ul1, li8);
    			append_dev(ul1, t19);
    			append_dev(ul1, li9);
    			append_dev(main, t21);
    			append_dev(main, ul2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul2, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(li0, "click", /*goToPrevMonth*/ ctx[8], false, false, false),
    					listen_dev(li1, "click", /*goToNextMonth*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*month*/ 4) set_data_dev(t4, /*month*/ ctx[2]);
    			if (dirty & /*year*/ 2) set_data_dev(t6, /*year*/ ctx[1]);

    			if (dirty & /*firstDayIndex, numberOfDays, today, monthIndex, year, calendarCellsQsty*/ 123) {
    				each_value = Array(/*calendarCellsQsty*/ ctx[5]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let month;
    	let firstDayIndex;
    	let numberOfDays;
    	let calendarCellsQsty;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Calendar', slots, []);
    	const date = new Date();

    	const today = {
    		dayNumber: date.getDate(),
    		month: date.getMonth(),
    		year: date.getFullYear()
    	};

    	const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
    	let monthIndex = date.getMonth();
    	let year = date.getFullYear();
    	let currentDay = date.getDate();

    	const goToNextMonth = () => {
    		if (monthIndex >= 11) {
    			$$invalidate(1, year += 1);
    			return $$invalidate(0, monthIndex = 0);
    		}

    		$$invalidate(0, monthIndex += 1);
    	};

    	const goToPrevMonth = () => {
    		if (monthIndex <= 0) {
    			$$invalidate(1, year -= 1);
    			return $$invalidate(0, monthIndex = 11);
    		}

    		$$invalidate(0, monthIndex -= 1);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Calendar> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$capture_state = () => ({
    		Calendar: Calendar_1,
    		date,
    		today,
    		monthNames,
    		monthIndex,
    		year,
    		currentDay,
    		goToNextMonth,
    		goToPrevMonth,
    		month,
    		numberOfDays,
    		firstDayIndex,
    		calendarCellsQsty
    	});

    	$$self.$inject_state = $$props => {
    		if ('monthIndex' in $$props) $$invalidate(0, monthIndex = $$props.monthIndex);
    		if ('year' in $$props) $$invalidate(1, year = $$props.year);
    		if ('currentDay' in $$props) currentDay = $$props.currentDay;
    		if ('month' in $$props) $$invalidate(2, month = $$props.month);
    		if ('numberOfDays' in $$props) $$invalidate(3, numberOfDays = $$props.numberOfDays);
    		if ('firstDayIndex' in $$props) $$invalidate(4, firstDayIndex = $$props.firstDayIndex);
    		if ('calendarCellsQsty' in $$props) $$invalidate(5, calendarCellsQsty = $$props.calendarCellsQsty);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*monthIndex*/ 1) {
    			//let month = date.toLocaleString('ko-KR', {month: 'long'});
    			$$invalidate(2, month = monthNames[monthIndex]);
    		}

    		if ($$self.$$.dirty & /*year, monthIndex*/ 3) {
    			$$invalidate(4, firstDayIndex = new Date(year, monthIndex, 1).getDay());
    		}

    		if ($$self.$$.dirty & /*year, monthIndex*/ 3) {
    			$$invalidate(3, numberOfDays = new Date(year, monthIndex + 1, 0).getDate());
    		}

    		if ($$self.$$.dirty & /*firstDayIndex*/ 16) {
    			$$invalidate(5, calendarCellsQsty = firstDayIndex <= 4 ? 35 : 42);
    		}

    		if ($$self.$$.dirty & /*monthIndex, firstDayIndex, numberOfDays, month*/ 29) {
    			console.log(`Month index:${monthIndex} ---- First Day Index: ${firstDayIndex} -- Number of Days:          ${numberOfDays}----${month} ${today.dayNumber}`);
    		}
    	};

    	return [
    		monthIndex,
    		year,
    		month,
    		numberOfDays,
    		firstDayIndex,
    		calendarCellsQsty,
    		today,
    		goToNextMonth,
    		goToPrevMonth,
    		click_handler
    	];
    }

    class Calendar_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Calendar_1",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Scheduler.svelte generated by Svelte v3.52.0 */

    const file$1 = "src\\Scheduler.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div0;
    	let span0;
    	let t1;
    	let div1;
    	let h2;
    	let t3;
    	let input;
    	let t4;
    	let span1;
    	let t6;
    	let ul;
    	let li0;
    	let t8;
    	let li1;
    	let t10;
    	let li2;
    	let t12;
    	let li3;
    	let t14;
    	let li4;
    	let t16;
    	let li5;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "×";
    			t1 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "My To Do List";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			span1 = element("span");
    			span1.textContent = "Add";
    			t6 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Hit the gym";
    			t8 = space();
    			li1 = element("li");
    			li1.textContent = "Pay bills";
    			t10 = space();
    			li2 = element("li");
    			li2.textContent = "Meet George";
    			t12 = space();
    			li3 = element("li");
    			li3.textContent = "Buy eggs";
    			t14 = space();
    			li4 = element("li");
    			li4.textContent = "Read a book";
    			t16 = space();
    			li5 = element("li");
    			li5.textContent = "Organize office";
    			attr_dev(span0, "class", "close svelte-1nndnon");
    			attr_dev(span0, "title", "Close Modal");
    			add_location(span0, file$1, 8, 8, 76);
    			attr_dev(div0, "id", "closer-cont");
    			attr_dev(div0, "class", "svelte-1nndnon");
    			add_location(div0, file$1, 7, 4, 44);
    			attr_dev(h2, "class", "svelte-1nndnon");
    			add_location(h2, file$1, 14, 8, 224);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "id", "myInput");
    			attr_dev(input, "placeholder", "Title...");
    			attr_dev(input, "class", "svelte-1nndnon");
    			add_location(input, file$1, 15, 8, 256);
    			attr_dev(span1, "onclick", "newElement()");
    			attr_dev(span1, "class", "addBtn svelte-1nndnon");
    			add_location(span1, file$1, 16, 8, 321);
    			attr_dev(div1, "id", "myDIV");
    			attr_dev(div1, "class", "header svelte-1nndnon");
    			add_location(div1, file$1, 13, 4, 183);
    			attr_dev(li0, "class", "svelte-1nndnon");
    			add_location(li0, file$1, 20, 8, 423);
    			attr_dev(li1, "class", "checked svelte-1nndnon");
    			add_location(li1, file$1, 21, 8, 453);
    			attr_dev(li2, "class", "svelte-1nndnon");
    			add_location(li2, file$1, 22, 8, 497);
    			attr_dev(li3, "class", "svelte-1nndnon");
    			add_location(li3, file$1, 23, 8, 527);
    			attr_dev(li4, "class", "svelte-1nndnon");
    			add_location(li4, file$1, 24, 8, 554);
    			attr_dev(li5, "class", "svelte-1nndnon");
    			add_location(li5, file$1, 25, 8, 584);
    			attr_dev(ul, "id", "myUL");
    			attr_dev(ul, "class", "svelte-1nndnon");
    			add_location(ul, file$1, 19, 4, 399);
    			attr_dev(section, "class", "svelte-1nndnon");
    			add_location(section, file$1, 5, 0, 27);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div0);
    			append_dev(div0, span0);
    			append_dev(section, t1);
    			append_dev(section, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t3);
    			append_dev(div1, input);
    			append_dev(div1, t4);
    			append_dev(div1, span1);
    			append_dev(section, t6);
    			append_dev(section, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t8);
    			append_dev(ul, li1);
    			append_dev(ul, t10);
    			append_dev(ul, li2);
    			append_dev(ul, t12);
    			append_dev(ul, li3);
    			append_dev(ul, t14);
    			append_dev(ul, li4);
    			append_dev(ul, t16);
    			append_dev(ul, li5);

    			if (!mounted) {
    				dispose = listen_dev(span0, "click", /*click_handler*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Scheduler', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Scheduler> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	return [click_handler];
    }

    class Scheduler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Scheduler",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.52.0 */
    const file = "src\\App.svelte";

    // (10:1) {#if schedulerShowing}
    function create_if_block(ctx) {
    	let scheduler;
    	let current;
    	scheduler = new Scheduler({ $$inline: true });
    	scheduler.$on("click", /*click_handler_1*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(scheduler.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(scheduler, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(scheduler.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(scheduler.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(scheduler, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(10:1) {#if schedulerShowing}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let calendar;
    	let t;
    	let current;
    	calendar = new Calendar_1({ $$inline: true });
    	calendar.$on("click", /*click_handler*/ ctx[1]);
    	let if_block = /*schedulerShowing*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(calendar.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(main, "class", "svelte-z847fo");
    			add_location(main, file, 7, 0, 141);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(calendar, main, null);
    			append_dev(main, t);
    			if (if_block) if_block.m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*schedulerShowing*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*schedulerShowing*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(main, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(calendar.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(calendar.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(calendar);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let schedulerShowing = false;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(0, schedulerShowing = true);
    	const click_handler_1 = () => $$invalidate(0, schedulerShowing = false);
    	$$self.$capture_state = () => ({ Calendar: Calendar_1, Scheduler, schedulerShowing });

    	$$self.$inject_state = $$props => {
    		if ('schedulerShowing' in $$props) $$invalidate(0, schedulerShowing = $$props.schedulerShowing);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [schedulerShowing, click_handler, click_handler_1];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
