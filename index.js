'use strict'

class Lazy {
    constructor(label, args, func,)
    {
        this._label = label;
        this._args  = args;
        this._func  = func;
    }

    get label() {return this._label;}

    evaluate = this._eval_new;

    get item() {return this.evaluate()._item;}

    display()
    {
        if(vazio(this)) console.log('Exit');
        else            console.log(this.item);
        return 'You dont just display display';
    }
}

Lazy.prototype._eval_new = function(){
    let args = this._args;
    let func = this._func;

    delete this._args;
    delete this._func;

    this.evaluate = this._eval_done;

    Object.assign(this,func(args));
    return this;
}

Lazy.prototype._eval_done = function(){return this;}

const exit = {};

function vazio(_list) {return _list.item === exit}

function pred_true() {return true}

function pred_false() {return false}

function pred_equal(reference) {return (item) => {return item === reference}}

function validate_pred(pred) {return ({_list}) => {return pred(_list.item)}}

function advance_func({_list,_func}) {return {_list: _list.next, _func:_func}}

function advance_n({_list,_n}){return {_list: _list.next, _n: _n-1}}

function id(func) {
    if(func === undefined) return (item) => {return item};
    return (item) => {func(item);return item;};
}

class List extends Lazy {
    constructor(_label, _item, {_predicate, _advance, _validate, _apply, _next}) {
        super(_label, {_item, _functions: {_predicate, _advance, _validate, _apply, _next}},
            ({_item, _functions: {_predicate, _apply, _validate, _advance, _next}}) => {

                if (_predicate === undefined)
                if (_item._list.item === exit)
                    return {_item: exit, _next: null};

                if (_predicate !== undefined)
                if (_predicate(_item))
                    return {_item: exit, _next: null};

                let _next_default = new List(_label, _advance(_item), {_predicate, _advance, _validate, _apply, _next});

                let _next_list;
                if (_next === undefined)    _next_list = _next_default;
                else                        _next_list = _next(_item, _next_default);

                if (_validate !== undefined)
                if (!_validate(_item))
                    return _next_list.evaluate();

                if (_apply === undefined) _item = _item._list.item;
                else _item = _apply(_item);

                return {_item: _item, _next: _next_list};
            });
    }

    get next() {
        return this.evaluate()._next;
    }
}

List.prototype.take = function(n){
    return new List ('Take', {_list: this, _n: n}, {
                            _predicate: ({_list, _n}) => {return vazio(_list) || _n === 0},
                            _advance:   advance_n,
                        });
}

List.prototype.map = function(func){
    return new List ('Map', {_list: this, _func: func}, {
                            _advance: advance_func,
                            _apply: ({_list, _func}) => {return _func(_list.item)}
                        });
}

List.prototype.filter = function(pred){
    return new List ('Filter', {_list: this}, {
                            _advance: advance_func,
                            _validate: validate_pred(pred)
                        });
}

List.prototype.until = function(pred){
    return new List ('Until',{_list: this, }, {
                            _predicate: validate_pred(pred),
                            _advance: advance_func
                        })
}

List.prototype.combine = function(list,func){
    return new List('Combine', {_list_a: this, _list_b: list}, {
        _predicate: ({_list_a, _list_b}) => {
            return vazio(_list_a) || vazio(_list_b)
        },
        _advance: ({_list_a, _list_b}) => {
            return {_list_a: _list_a.next, _list_b: _list_b.next}
        },
        _apply: ({_list_a, _list_b}) => {
            return func(_list_a.item, _list_b.item)
        }
    });
}

List.prototype.toLazy = function(){return new Lazy(this.label + ' toLazy',this,(list) => {return {_item:list.item}})}

List.prototype.reduce = function(func,offset){
    return new List ('Reduce', {_offset: offset,_list: this},{
                            _predicate: pred_false,
                            _advance:   ({_offset,_list}) => {return {_offset: func(_offset,_list.item),_list: _list.next}},
                            _validate:  ({_list}) => {return _list.item === exit},
                            _apply:     ({_offset}) => {return _offset}
                        }).toLazy();
}

List.prototype.reduceMap = function(func,offset){
    return new List ('ReduceMap',{_offset:offset,_list:this}, {
                        _predicate: ({_list}) => {return _list === null},
                        _advance:   ({_offset,_list}) => {return {_offset: func(_offset,_list.item), _list: _list.next}},
                        _apply:     ({_offset,_list}) => {return _offset}});
}

List.prototype.append = function(list){
    return new List ('Append',{_list: this, _append: list}, {
                        _predicate: ({_list}) => {return _list === null},
                        _advance:   ({_list,_append}) => {return {_list: _list.next,_append:_append}},
                        _apply:     ({_list, _append}) => {
                                        if(vazio(_list))    return _append.item;
                                        else                return _list.item
                                    },
                        _next:      ({_list, _append},_next_default) => {
                                        if(vazio(_list))    return _append.next;
                                        else                return _next_default
                                    }
                        });
}

List.prototype.first = function(pred){
    return new Lazy ('Lazy',
                    new List('First',{_list: this},{
                        _advance: ({_list}) => {return {_list: _list.next}},
                        _validate: validate_pred(pred)
                    }),
                    (list) => {
                        if(pred(list.item)) return {_valid: true, _item: list.item};
                        else                return {_valid: false};
                    });
}

List.prototype.access = function(n){
    return new Lazy('Lazy',
        new List('Access', {_list: this, _n: n},{
            _advance:  advance_n,
            _validate: ({_n}) => {return _n === 0}
        }),
        (list) => {
            if(list.item === exit)  return {_valid: false};
            else                    return {_valid: true, _item: list.item};
        });
}

List.prototype.update = function (n,item){
    return new List('Update', {_list: this, _n: n},{
        _advance: advance_n,
        _apply: ({_list,_n}) => {
                    if(_n === 0) return item
                    else         return _list.item
                },
        _next: ({_list,_n},_next_default) => {
                    if(_n === 0) return _list.next;
                    else         return _next_default;
                }
    })
}

List.prototype.length = function(){
    return new List('Length',{_list: this, _n: 0},{
        _predicate: pred_false,
        _advance:   ({_list,_n}) => {return {_list: _list.next, _n: _n+1}},
        _validate:  ({_list}) => {return _list.item === exit},
        _apply:     ({_n}) =>{return _n}
    })
}

List.prototype.displayAll = function(){
    this.display();
    if(!vazio(this.next))
        this.next.displayAll();
}

function residue(m) {return (n) => {return n%m !== 0}}

function moreEqualThen(m) {return (n) => {return n>=m}}

function soma(a,b) {return a+b}

function mult(a,b) {return a*b}

function somaHigh(a) {return (b) => {return a+b}}

function imediate(item) {
    return new List('Imediate',item,{
                                _predicate: pred_false,
                                _advance:   () => {return null},
                                _apply:     id(),
                                _next:      () => {return null}
                            }).evaluate();
}

function displayAll(_list) {
    let list = _list;
    while(!vazio(list))
    {
        list.display();
        list = list.next;
    }
}

function num(n1,n2) {
    let _predicate;
    if(n2 === undefined) _predicate = pred_false;
    else                 _predicate = moreEqualThen(n2);
    return new List('Num',n1, {
                        _predicate: _predicate,
                        _advance: somaHigh(1),
                        _apply: id()
                    });
}

function siege() {

    function siegeLazy(list, list_p)
    {
        return new List('Siege', {_list: list, _list_p: list_p},{
            _advance:   ({_list,_list_p}) => {
                            const n = _list.item;
                            const p = _list_p.item;
                            if(n === p*p)
                                return {_list: _list.next.filter(residue(p)), _list_p: _list_p.next};
                            return {_list: _list.next, _list_p: _list_p};
                        },
            _validate:  ({_list,_list_p}) => {
                            const n = _list.item;
                            const p = _list_p.item;
                            return n !== p*p
                        }
            });
    }

    let n = imediate(2);
    n._next = siegeLazy(num(3),n);
    return n;
}

function fibonacci() {
    return new List('Fibonacci', {_a: 1, _b: 1}, {
                    _predicate: pred_false,
                    _advance:   ({_a,_b})=>{return {_a:_b,_b:_a+_b}},
                    _apply:     ({_a,_b})=>{return  _a}});
}

Array.prototype.toLazy = function () {
    const arr = this;
    return new List('Array to Lszy List',0,{
        _predicate: (_n) => {return _n === arr.length},
        _advance: (_n) => {return _n+1},
        _apply: (_n) => {return arr[_n]}
    });
}
