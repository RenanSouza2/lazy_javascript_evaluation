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

function validate_pred(pred) {return ({_list}) => {return vazio(_list) || pred(_list.item)}}

function advance_list({_list}) {return {_list: _list.next}}

function advance_n({_list,_n}){return {_list: _list.next, _n: _n-1}}

function id(func) {
    if(func === undefined) return (item) => {return item};
    return (item) => {func(item); return item;};
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

                let _next_list = null;
                if(_next !== undefined) _next_list = _next(_item);

                if(_next_list === null)
                {
                    if(_advance === undefined) _advance = advance_list;
                    _next_list = new List(_label, _advance(_item), {_predicate, _advance, _validate, _apply, _next});
                }

                if (_validate !== undefined)
                if (!_validate(_item))
                    return _next_list.evaluate();

                if (_apply === undefined) _item = _item._list.item;
                else _item = _apply(_item);

                return {_item: _item, _next: _next_list};
            });
    }

    get next() {return this.evaluate()._next}
}

List.prototype.evaluateAll = function() {
    if(vazio(this)) return;
    this.next.evaluateAll();
}



List.prototype.take = function(n){
    return new List ('Take', {_list: this, _n: n}, {
                            _predicate: ({_list, _n}) => {return vazio(_list) || _n === 0},
                            _advance:   advance_n,
                        });
}

List.prototype.map = function(func){
    return new List ('Map', {_list: this}, {
            _advance: advance_list,
            _apply: ({_list}) => {return func(_list.item)}
        });
}

List.prototype.filter = function(pred){
    return new List ('Filter', {_list: this}, {
                            _advance: advance_list,
                            _validate: validate_pred(pred)
                        });
}

List.prototype.from = function(pred){
    return new List('From',{_list: this},{
            _validate: validate_pred(pred),
            _advance: advance_list,
            _next: ({_list}) => {
                if(pred(_list.item)) return _list.next;
                else                 return null;
            }
        })
}

List.prototype.until = function(pred){
    return new List ('Until',{_list: this, }, {
                            _predicate: validate_pred(pred),
                            _advance: advance_list
                        })
}

List.prototype.reduceMap = function(func,offset){
    return new List ('ReduceMap',{_offset:offset,_list:this}, {
        _predicate: ({_list}) => {return _list === null},
        _advance:   ({_offset,_list}) => {return {_offset: func(_offset,_list.item), _list: _list.next}},
        _apply:     ({_offset,_list}) => {return _offset}
    }).next;
}

List.prototype.append = function(list){
    return new List ('Append',{_list: this, _append: list}, {
                        _predicate: ({_list}) => {return _list === null},
                        _advance:   ({_list,_append}) => {return {_list: _list.next,_append:_append}},
                        _apply:     ({_list, _append}) => {
                                        if(vazio(_list))    return _append.item;
                                        else                return _list.item
                                    },
                        _next:      ({_list, _append}) => {
                                        if(vazio(_list))    return _append.next;
                                        else                return null;
                                    }
                        });
}

List.prototype.update = function (n,item){
    return new List('Update', {_list: this, _n: n},{
        _advance: advance_n,
        _apply: ({_list,_n}) => {
                    if(_n === 0) return item
                    else         return _list.item
                },
        _next: ({_list,_n}) => {
                    if(_n === 0) return _list.next;
                    else         return null;
                }
    })
}

List.prototype.plain = function(){
    return new List('Plain',{_list: this, _item: this.item},{
        _advance:   ({_list,_item}) => {
                        if(vazio(_item))
                            return {
                                _list: _list.next,
                                _item: _list.next.item
                            };
                        return {
                            _list: _list,
                            _item: _item.next
                        };
                    },
        _validate:  ({_item}) => {return !vazio(_item)},
        _apply:     ({_item}) => {return _item.item},
    });
}

List.prototype.tensor = function(list,func){return this.map((item_a)=>{return list.map((item_b)=>{return func(item_a,item_b)})})}

List.prototype.envelope = function() {
    return new List('Envelope',{_list:this},{
        _apply: ({_list}) => {return _list}
    })
}



List.prototype.access = function(n){
    const res = new List('Access', {_list: this, _n: n},{
        _advance:  advance_n,
        _validate: ({_n}) => {return _n === 0}
    }).item;
    if(res === exit) return undefined;
    return res;
}

List.prototype.first  = function(pred) {
    let res = this.from(pred).item;
    if(res === exit) return undefined;
    return res;
}

List.prototype.reduce = function(func,offset){
    return new List ('Reduce', {_offset: offset,_list: this},{
        _predicate: pred_false,
        _advance:   ({_offset,_list}) => {return {_offset: func(_offset,_list.item),_list: _list.next}},
        _validate:  ({_list}) => {return _list.item === exit},
        _apply:     ({_offset}) => {return _offset},
        _next:      ({_list}) => {
                        if(vazio(_list)) return exit;
                        else             return null;
                    }
    }).item;
}

List.prototype.toArray = function() {
    return this
            .map((item) => {return [item]})
            .reduce((arr1,arr2) => {return [...arr1,...arr2]},[]);
}

List.prototype.length = function(){
    return new List('Length',{_list: this, _n: 0},{
        _predicate: pred_false,
        _advance:   ({_list,_n}) => {return {_list: _list.next, _n: _n+1}},
        _validate:  ({_list}) => {return _list.item === exit},
        _apply:     ({_n}) =>{return _n}
    }).item;
}

List.prototype.displayAll = function(){
    this.display();
    if(vazio(this)) return;
    this.next.displayAll();
}



function combine(list_a,list_b,func){
    return new List('Combine', {_list_a: list_a, _list_b: list_b}, {
        _predicate: ({_list_a, _list_b}) => {return vazio(_list_a) || vazio(_list_b)},
        _advance:   ({_list_a, _list_b}) => {return {_list_a: _list_a.next, _list_b: _list_b.next}},
        _apply:     ({_list_a, _list_b}) => {return func(_list_a.item, _list_b.item)}
    });
}

function join_ordered(list_a, list_b) {
    return new List('Join ordered',{_list_a: list_a, _list_b: list_b},{
        _predicate: pred_false,
        _advance:   ({_list_a,_list_b}) => {
            if(_list_a.item < _list_b.item)
                return {
                    _list_a: _list_a.next,
                    _list_b: _list_b
                };
            return {
                _list_a: _list_a,
                _list_b: _list_b.next
            };
        },
        _apply:     ({_list_a,_list_b}) => {
            if(_list_a.item < _list_b.item) return _list_a.item;
            return _list_b.item;
        },
        _next:      ({_list_a,_list_b}) => {
            if(_list_a.item < _list_b.item)
            {
                if(vazio(_list_a.next))
                    return _list_b;
            }
            else
            {
                if(vazio(_list_b.next))
                    return _list_a;
            }
            return null;
        }
    })
}



function residue(m) {return (n) => {return n%m !== 0}}

function moreEqualThen(m) {return (n) => {return n>=m}}

function soma(a,b) {return a+b}

function mult(a,b) {return a*b}

function somaHigh(a) {return (b) => {return a+b}}

function multHigh(a) {return (b) => {return a*b}}

function imediate(item) {
    return new List('Imediate',item,{
                                _predicate: pred_false,
                                _advance:   () => {return null},
                                _apply:     id(),
                                _next:      () => {return exit}
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

function test() {
    console.log();
    console.log([0,1,2,3,4]);
    num(0,5).displayAll();

    console.log();
    console.log([0,1,2,3,4]);
    num().take(5).displayAll();

    console.log();
    console.log([0,2,4,6,8]);
    num(0,5).map(multHigh(2)).displayAll();

    console.log();
    console.log([0,2,4]);
    num(0,5).filter((n) => {return n%2 === 0}).displayAll();

    console.log();
    console.log('Nada');
    num(0,5).filter(moreEqualThen(10)).displayAll();

    console.log();
    console.log([3,4]);
    num(0,5).from(moreEqualThen(3)).displayAll();

    console.log();
    console.log('Nada');
    num(0,5).from(moreEqualThen(10)).displayAll();

    console.log();
    console.log([0,1,2,3,4]);
    num().until(moreEqualThen(5)).displayAll();

    console.log();
    console.log([0,1,2,3,4]);
    num(0,5).until(moreEqualThen(10)).displayAll();

    console.log();
    console.log([0,1,2,3,4]);
    num(0,5).until(moreEqualThen(10)).displayAll();

    console.log();
    console.log([[0,10],[1,11],[2,12],[3,13],[4,14]]);
    num(0,5).combine(num(10),(item_a,item_b) => {return [item_a,item_b]}).displayAll();

    console.log();
    console.log([0,1,3,6,10]);
    num(0,5).reduceMap(soma,0).displayAll();

    console.log();
    console.log([0,1,2,3,4,10,11,12,13,14]);
    num(0,5).append(num(10,15)).displayAll();

    console.log();
    console.log([0,1,2,3,4,10,11,12,13,14]);
    num(0,5).append(num(10,15)).displayAll();

    console.log();
    console.log([0,1,2,'Teste',4]);
    num(0,5).update(3,'Teste').displayAll();

    console.log();
    console.log(3);
    console.log(num().access(3));

    console.log();
    console.log(undefined);
    console.log(num(0,5).access(10));

    console.log();
    console.log(3);
    console.log(num().first(moreEqualThen(3)));

    console.log();
    console.log(undefined);
    console.log(num(0,5).first(moreEqualThen(10)));

    console.log();
    console.log(10);
    console.log(num(0,5).reduce(soma,0));

    console.log();
    console.log([0,1,2,3,4]);
    console.log(num(0,5).toArray());

    console.log();
    console.log(5);
    console.log(num(0,5).length());
}



function num(n1,n2) {
    if(n1 === undefined) n1 = 0;
    let _predicate;
    if(n2 === undefined) _predicate = pred_false;
    else                 _predicate = moreEqualThen(n2);
    return new List('Num',n1, {
                        _predicate: _predicate,
                        _advance: somaHigh(1),
                        _apply: id()
                    });
}

function sieveLazy(list, list_filter) {
    return new List('Sieve', {_list: list, _list_filter: list_filter},{
        _advance:   ({_list,_list_filter}) => {
            const n = _list.item;
            const p = _list_filter.item;
            if(n === p*p)
                return {_list: _list.next.filter(residue(p)), _list_filter: _list_filter.next};
            return {_list: _list.next, _list_filter: _list_filter};
        },
        _validate:  ({_list,_list_filter}) => {
            const n = _list.item;
            const p = _list_filter.item;
            return n !== p*p
        }
    });
}

function fibonacci() {
    return new List('Fibonacci', {_a: 1, _b: 1}, {
                    _predicate: pred_false,
                    _advance:   ({_a,_b})=>{return {_a:_b,_b:_a+_b}},
                    _apply:     ({_a,_b})=>{return  _a}});
}

function toLazy(arr){
    return new List('Array to Lszy List',0,{
        _predicate: (_n) => {return _n === [...arr].length},
        _advance:   (_n) => {return _n+1},
        _apply:     (_n) => {return arr[_n]}
    });
}

function sieveTable(factorial){
    return (item_a,item_b) => {
        return item_a*factorial+item_b
    }
}

function badsieve(){return new List('Badsieve',{_list: num(2)},{_advance: ({_list}) => {return {_list: _list.next.filter(residue(_list.item))}}})}

function sieve() {
    let n = imediate(2);
    n._next = sieveLazy(num(3),n);
    return n;
}

function megaSieve(){
    let proximo = imediate(5);
    proximo._next = new List('Megasieve',{
        _proximo: proximo,
        _list: sieveLazy(num(1,5).tensor(toLazy([1,5]),sieveTable(6)).plain(),proximo),
        _fatorial: 6,
    },{
        _predicate: pred_false,
        _advance:   ({_proximo,_list,_fatorial}) => {
                        if(vazio(_list)) {
                            _fatorial *= _proximo.item;
                            _proximo   = _proximo.next;
                            return {
                                _proximo: _proximo,
                                _list: sieveLazy(num(1,_proximo.item).tensor(toLazy([1]).append(_proximo.until(moreEqualThen(_fatorial))),sieveTable(_fatorial)).plain(),_proximo),
                                _fatorial: _fatorial
                            }
                        }
                        return {
                            _proximo: _proximo,
                            _list: _list.next,
                            _fatorial: _fatorial
                        }
                    },
        _validate:  ({_proximo,_list,_fatorial}) => {return !vazio(_list)},
    })
    return toLazy([2,3]).append(proximo);
}

//displayAll(megaSieve());26748181

function getTime(){return new Date().getTime()}

function ShowTime(){
    function displayAllTime(list, tam){
        let before = getTime();
        do {
            for(let i=0; i<tam; i++) {
                if(vazio(list)) break;
                list = list.next;
            }
            console.log(list.item + ',' + (getTime() - before));
        }
        while(!vazio(list))
    }

    console.log('sep=,');
    displayAllTime(sieve().until(moreEqualThen(26285670)), 10000);
}


