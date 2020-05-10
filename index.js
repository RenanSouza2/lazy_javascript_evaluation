'use strict'

class Lazy
{
    constructor(
        label, args, func,)
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

    display() {console.log(this.evaluate());}
}

const exit = {};

function vazio(_lista) {return _lista.item === exit}

function pred_vazio({_lista}) {return  !vazio(_lista);}

function pred_true() {return true}

function apply_item({_lista}){return _lista.item}

function evaluate_predicate({_lista,_func}) {return _func(_lista.item);}

function advance_func({_lista,_func}) {return {_lista: _lista.next, _func:_func}}

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

                return {
                    _item: _apply(_item),
                    _next: _next
                };
            });
    }

    get item() {return this.evaluate()._item;}
    get next() {return this.evaluate()._next;}

    display()
    {
        if(vazio(this)) console.log('Exit');
        else            console.log(this.item);
    }

    take(n)
    {
        return new List('take', {_lista: this, _n: n},
                        ({_lista, _n})=>{return !vazio(_lista) && _n !== 0;},
                        ({_lista, _n})=>{return {_lista: _lista.next, _n: _n-1}},
                        pred_true,apply_item);
    }

    map(func)
    {
        return new List('Map', {_lista: this, _func: func},
                        pred_vazio, advance_func, pred_true,
                        ({_lista, _func}) => {return _func(_lista.item);});
    }

    filter(pred)
    {
        return new List('Filter', {_lista: this, _func: pred},
                        pred_vazio, advance_func,
                        evaluate_predicate, apply_item);
    }

    while(pred)
    {
        return new List('Until',{_lista: this, _func: pred},
                        evaluate_predicate,
                        advance_func, pred_true, apply_item)
    }

    displayAll()
    {
        this.display();
        if(!vazio(this.next))
            this.next.displayAll();
    }
}

function imediate(item)
{
    let res =  new List('Imediate',item,pred_true,()=>{return null},pred_true,id()).evaluate();
    res._next = null;
    return res;
}

function displayAll(_lista)
{
    let lista = _lista;
    while(!vazio(lista))
    {
        lista.display();
        lista = lista.next;
    }
}

function num(n1, n2)
{
    if(n2 === undefined) return new   List('Num',n1,pred_true,(_args) => {return _args+1;},pred_true,id());
    return new List('Num',n1, (_args) => {return _args < n2;},(_args) => {return _args+1;},pred_true,id());
}

function residue(m) {return (n) => {return n%m !== 0}}

function siegeLazy(lista, lista_p)
{
    return new List('Siege', {_lista: lista, _lista_p: lista_p},
        pred_true,
        ({_lista,_lista_p}) =>
        {
            const n = _lista.item;
            const p = _lista_p.item;
            if(n === p*p)
                return {_lista: _lista.next.filter(residue(p)), _lista_p: _lista_p.next};
            return {_lista: _lista.next, _lista_p: _lista_p};
        },
        ({_lista,_lista_p}) =>
        {
            const n = _lista.item;
            const p = _lista_p.item;
            return n !== p*p
        },
        apply_item);
}

function siege()
{
    let n = imediate(2);
    n._next = siegeLazy(num(3),n);
    return n;
}

let n = siege();
n.while((n)=>{return n<500}).displayAll();
