'use strict'

class Lazy
{
    constructor(label, args, func,)
    {
        this._label = label;
        this._args  = args;
        this._func  = func;
    }

    get label() {return this._label;}

    evaluate()
    {
        let args = this._args;
        let func = this._func;

        delete this._args;
        delete this._func;

        this.evaluate = () => {return this;}

        Object.assign(this,func(args));
        return this;
    }

    get item() {return this.evaluate()._item;}

    display()
    {
        if(vazio(this)) console.log('Exit');
        else            console.log(this.item);
        return 'You dont just display display';
    }
}

const exit = {};

function vazio(_list) {return _list.item === exit}

function pred_vazio({_list}) {return !vazio(_list);}

function pred_true() {return true}

function pred_false() {return true}

function apply_item({_list}){return _list.item}

function evaluate_predicate({_list,_func}) {return _func(_list.item);}

function advance_func({_list,_func}) {return {_list: _list.next, _func:_func}}

function id(func)
{
    if(func === undefined) return (item) => {return item};
    return (item) => {func(item);return item;};
}

class List extends Lazy
{
    constructor(_label, _item, _predicate, _advance, _validate, _apply)
    {
        super(_label,
            {_item,_predicate,_advance,_validate,_apply},
            ({_item,_predicate,_apply,_validate,_advance}) => {
                if(_predicate(_item) === false)
                    return {_item: exit, _next: null};

                let _next = new List(_label,_advance(_item),_predicate,_advance,_validate,_apply);

                if(!_validate(_item))
                    return _next.evaluate();

                return {_item: _apply(_item), _next: _next};
            });
    }

    get next() {return this.evaluate()._next;}

    take(n)
    {
        return new List ('take', {_list: this, _n: n},
                        ({_list, _n})=>{return !vazio(_list) && _n !== 0;},
                        ({_list, _n})=>{return {_list: _list.next, _n: _n-1}},
                        pred_true,apply_item);
    }

    map(func)
    {
        return new List ('Map', {_list: this, _func: func},
                        pred_vazio, advance_func, pred_true,
                        ({_list, _func}) => {return _func(_list.item);});
    }

    filter(pred)
    {
        return new List ('Filter', {_list: this, _func: pred},
                        pred_vazio, advance_func,
                        evaluate_predicate, apply_item);
    }

    while(pred)
    {
        return new List ('Until',{_list: this, _func: pred},
                        evaluate_predicate,
                        advance_func, pred_true, apply_item)
    }
    
    combine(list,func)
    {
        return new List ('Combine', {_list_a:this,_list_b:list},
                        ({_list_a,_list_b}) => {return !vazio(_list_a)&&!vazio(_list_b)},
                        ({_list_a,_list_b}) => {return {_list_a: _list_a.next, _list_b: _list_b.next}},
                        pred_true,
                        ({_list_a,_list_b}) => {return func(_list_a.item,_list_b.item)});
    }

    toLazy() {return new Lazy('toLazy ' + this.label ,this,(list) => {return {_item:list.item}});}
    
    reduce(offset,func)
    {
        return new List ('Reduce', {_offset: offset,_list: this},
                        ({_list}) => {return _list !== null;},
                        ({_offset,_list}) => {return {_offset: func(_offset,_list.item),_list: _list.next}},
                        ({_list}) => {return _list.next === null},
                        ({_offset}) => {return _offset}).toLazy();
    }

    reduceMap(offset,func)
    {
        return new List ('ReduceMap',{_offset:offset,_list:this}, pred_vazio,
                        ({_offset,_list}) => {return {_offset: func(_offset,_list.item),_list: _list.next}}, pred_vazio,
                        ({_offset,_list}) => {return func(_offset,_list.item)});
    }

    append(list)
    {
        return new List ('Append',{_list: this, _append: list},
                        ({_list}) => {return _list !== null;},
                        ({_list,_append}) => {return {_list: _list.next,_append:_append}},
                        pred_true,
                        ({_list, _append}) => {
                            if(_list.item === exit) return _append
                        });
    }

    count()
    {
        return this.map(()=>{return 1}).reduce(0,soma);
    }

    displayAll()
    {
        this.display();
        if(!vazio(this.next))
            this.next.displayAll();
    }
}

function residue(m) {return (n) => {return n%m !== 0;};}

function lessThan(m) {return (n) => {return n<m;};}

function soma(a,b) {return a+b;}
function mult(a,b) {return a*b;}

function somaHigh(a) {return (b) => {return a+b;}}

function imediate(item)
{
    let res =  new List('Imediate',item,pred_true,()=>{return null},pred_true,id()).evaluate();
    res._next = null;
    return res;
}

function displayAll(_list)
{
    let list = _list;
    while(!vazio(list))
    {
        list.display();
        list = list.next;
    }
}

function num(n1, n2)
{
    if(n2 === undefined) return new   List('Num',n1,pred_true,(_args) => {return _args+1;},pred_true,id());
    return new List('Num',n1, lessThan(n2) ,(_args) => {return _args+1;},pred_true,id());
}

function siege()
{

    function siegeLazy(list, list_p)
    {
        return new List('Siege', {_list: list, _list_p: list_p},
            pred_true,
            ({_list,_list_p}) =>
            {
                const n = _list.item;
                const p = _list_p.item;
                if(n === p*p)
                    return {_list: _list.next.filter(residue(p)), _list_p: _list_p.next};
                return {_list: _list.next, _list_p: _list_p};
            },
            ({_list,_list_p}) =>
            {
                const n = _list.item;
                const p = _list_p.item;
                return n !== p*p
            },
            apply_item);
    }


    let n = imediate(2);
    n._next = siegeLazy(num(3),n);
    return n;
}

function fibonacci()
{
    return new List('Fibonacci', {_a: 1, _b: 1}, pred_true,
                    ({_a,_b})=>{return {_a:_b,_b:_a+_b}}, pred_true,
                    ({_a,_b})=>{return  _a});
}


let n = num(0,5);
let m = num(10,15);
n.append(m).displayAll();

