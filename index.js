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

const end_list = {
    _item : exit,
    _next : null,
     empty: () => {return true}
}

function vazio(_list) {return _list.item === exit}



class List extends Lazy {
    constructor(_label,_args,_func) {super(_label,_args,_func);}
    get next() {return this.evaluate()._next}
}

List.prototype.evaluateAll = function() {
    if(this.empty()) return;
    this.next.evaluateAll();
}

List.prototype.empty = function() {return this.item === exit}

List.prototype.forEach = function(func){
    if(this.empty()) return;
    func(this.item);
    this.next.forEach(func);
}



List.prototype.take = function(n){
    return new List ('Take', {_list: this, _n: n},function ({_list,_n}) {
        if(_n === 0)        return end_list;
        if(_list.empty())   return end_list;
        return {
            _item: _list.item,
            _next: _list.next.take(n-1)
        }
    });
}

List.prototype.map = function(func){
    return new List ('Map', this, function (_list){
        if(_list.empty()) return end_list;
        return {
            _item: func(_list.item),
            _next: _list.next.map(func)
        }
    })
}

List.prototype.filter = function(pred){
    return new List ('Filter', this, function _func(_list) {
        if(_list.empty()) return end_list;
        if(pred(_list.item))
            return {
                _item: _list.item,
                _next: _list.next.filter(pred)
            }

        return _func(_list.next);
    })
}

List.prototype.from = function(pred){
    return new List('From',this,function _func(_list){
        if(_list.empty()) return end_list;
        if(pred(_list.item))
            return {
                _item: _list.item,
                _next: _list.next
            }

        return _func(_list.next);
    })
}

List.prototype.until = function(pred){
    return new List ('Until', this, function (_list){
        if(_list.empty())       return end_list;
        if(pred(_list.item))    return end_list;
        return {
            _item: _list.item,
            _next: _list.next.until(pred)
        }
    })
}

List.prototype.reduceMap = function(func,offset){
    return new List ('ReduceMap',{_offset:offset,_list:this}, function ({_offset,_list}){
        if(_list.empty()) return end_list;
        _offset = func(_offset,_list.item);
        return {
            _item: _offset,
            _next: _list.next.reduceMap(func,_offset)
        }
    })
}

List.prototype.append = function(list){
    return new List ('Append',this, function (_list) {
        if(_list.empty()) return list.evaluate();
        return {
            _item: _list.item,
            _next: _list.next.append(list)
        }
    })
}

List.prototype.update = function (n,item){
    return new List('Update', {_list: this, _n: n}, function _func({_list,_n}) {
        if(_list.empty()) return end_list;
        if(_n === 0)
            return {
                _item: item,
                _next: _list.next
            }
        return {
            _item: _list.item,
            _next: _list.next.update(n-1,item)
        }
    })
}

List.prototype.plain = function(){
    return new List('Plain',{_list: this, _item: this.item}, function _func({_list,_item}){
        if(_item.empty())
        {
            _list = _list.next;
            if(_list.empty()) return end_list;

            return _list.plain();
        }
        return {
            _item: _item.item,
            _next: new List('Plain',{_list: _list, _item: _item.next},_func)
        }
    });
}

List.prototype.tensor = function(list,func){return this.map((item_a)=>{return list.map((item_b)=>{return func(item_a,item_b)})})}

List.prototype.envelope = function() {
    return new List('Envelope',this, function _func(_list){
        if(_list.empty()) return end_list;
        return {
            _item: _list,
            _next: new List('Envelope',_list.next,_func)
        }
    })
}



List.prototype.access = function(n){
    if(this.empty()) return undefined;
    if(n === 0) return this.item;
    return this.next.access(n-1);
}

List.prototype.first  = function(pred) {
    let res = this.from(pred).item;
    if(res === exit) return undefined;
    return res;
}

List.prototype.reduce = function(func,offset) {
    if (this.empty()) return offset;
    return this.next.reduce(func, func(offset, this.item));
}

List.prototype.toArray = function() {
    return this
            .map((item) => {return [item]})
            .reduce((arr1,arr2) => {return [...arr1,...arr2]},[]);
}

List.prototype.length = function(){return this.map(()=>{return 1}).reduce(soma,0)}

List.prototype.displayAll = function(){
    this.display();
    if(vazio(this)) return;
    this.next.displayAll();
}



function combine(list_a,list_b,func){
    return new List('Combine', {_list_a: list_a, _list_b: list_b}, function _func({_list_a,_list_b}){
        if(_list_a.empty()) return end_list;
        if(_list_b.empty()) return end_list;

        return {
            _item: func(_list_a.item,_list_b.item),
            _next: combine(_list_a.next,_list_b.next,func)
        }
    });
}

function join_ordered(list_a, list_b) {
    return new List('Join ordered',{_list_a: list_a, _list_b: list_b},function (){
        if(_list_a.empty()) return end_list;

        let menor, maior;
        if(_list_a.item < _list_b.item)
        {
            menor = _list_a;
            maior = _list_b;
        }
        else
        {
            menor = _list_b;
            maior = _list_a;
        }

        return {
            _item: menor.item,
            _next: join_ordered(menor.next,maior)
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
    return new List('Imediate', undefined, () => {
        return {_item: item, _next: end_list}
    })
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
    console.log('Num');
    console.log([0,1,2,3,4]);
    num(0,5).displayAll();

    console.log();
    console.log('Take 5');
    console.log([0,1,2,3,4]);
    num().take(5).displayAll();

    console.log();
    console.log('Map +1');
    console.log([0,2,4,6,8]);
    num(0,5).map(multHigh(2)).displayAll();

    console.log();
    console.log('Filter par');
    console.log([0,2,4]);
    num(0,5).filter((n) => {return n%2 === 0}).displayAll();

    console.log();
    console.log('Filter >=10');
    console.log('Nada');
    num(0,5).filter(moreEqualThen(10)).displayAll();

    console.log();
    console.log('From >=3');
    console.log([3,4]);
    num(0,5).from(moreEqualThen(3)).displayAll();

    console.log();
    console.log('From 10');
    console.log('Nada');
    num(0,5).from(moreEqualThen(10)).displayAll();

    console.log();
    console.log('Until >=5');
    console.log([0,1,2,3,4]);
    num().until(moreEqualThen(5)).displayAll();

    console.log();
    console.log([0,1,2,3,4]);
    console.log('Until >=10');
    num(0,5).until(moreEqualThen(10)).displayAll();

    console.log();
    console.log('Combine [0...5][10...]');
    console.log([[0,10],[1,11],[2,12],[3,13],[4,14]]);
    combine(num(0,5),num(10),(item_a,item_b) => {return [item_a,item_b]}).displayAll();

    console.log();
    console.log('ReduceMap soma');
    console.log([0,1,3,6,10]);
    num(0,5).reduceMap(soma,0).displayAll();

    console.log();
    console.log('Append[0...5][10...15]');
    console.log([0,1,2,3,4,10,11,12,13,14]);
    num(0,5).append(num(10,15)).displayAll();

    console.log();
    console.log('Update 3 Test');
    console.log([0,1,2,'Test',4]);
    num(0,5).update(3,'Test').displayAll();

    console.log();
    console.log('Access 3');
    console.log(3);
    console.log(num().access(3));

    console.log();
    console.log('Access 10');
    console.log(undefined);
    console.log(num(0,5).access(10));

    console.log();
    console.log('First >=3');
    console.log(3);
    console.log(num().first(moreEqualThen(3)));

    console.log();
    console.log('First 10');
    console.log(undefined);
    console.log(num(0,5).first(moreEqualThen(10)));

    console.log();
    console.log('Reduce soma');
    console.log(10);
    console.log(num(0,5).reduce(soma,0));

    console.log();
    console.log('To array');
    console.log([0,1,2,3,4]);
    console.log(num(0,5).toArray());

    console.log();
    console.log('Length');
    console.log(5);
    console.log(num(0,5).length());
}



function num(n1, n2) {
    if(n1 === undefined) n1 = 0;

    let func;
    if(n2 === undefined)
    func = function _func(n){
        return {
            _item: n,
            _next: new List('Num',n+1,_func)
        }
    }
    else
    func = function _func(n) {
        if(n === n2) return end_list;
        return {
            _item: n,
            _next: new List('Num',n+1,_func)
        }
    }

    return new List('Num',n1,func);
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

function generate_coprimes(list,lim) {
    let pred = moreEqualThen(lim);
    list = list.until(pred);
    return combine(list,list.envelope(),(item_a,item_b) => {
        return item_b.map(multHigh(item_a)).until(pred);
    }).until((item)=>{return item.empty()})
}

let n = num(1);

generate_coprimes(n,100).forEach((item)=>{item.displayAll()});