'use strict'

class Lazy
{
    constructor(label, args, func)
    {
        this._args  = args;
        this._func  = func;
        this._label = label;
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

    display() {console.log(this.evaluate());console.log(this.label);}
}

const exit = {};

class List extends Lazy
{
    constructor(_label,_item,_predicate,_application,_advance)
    {
        super(_label, {_item,_predicate,_application,_advance}, ({_item,_predicate,_application,_advance}) => {
            if(_predicate(_item) === false)
                return {_item: exit, _next: null};

            return {
                _item: _application(_item),
                _next: new List(_label,_advance(_item),_predicate,_application,_advance)
            };
        });
    }

    get item() {return this.evaluate()._item;}
    get next() {return this.evaluate()._next;}

    display()
    {
        if(vazio(this)) console.log("Exit");
        else            console.log(this.item);
        //console.log("label: " + this.label);
    }

    evaluateNow()
    {
        if(vazio(this))
            return;
        this.next.evaluateNow();
        return this;
    }


    pega(n)
    {

        return new List("Pega", {_lista: this, _n: n},
                        ({_lista, _n})=>{return !vazio(_lista) && _n !== 0;},
                        ({_lista, _n})=>{return _lista.item},
                        ({_lista, _n})=>{return {_lista: _lista.next, _n: _n-1}});
    }

    map(func)
    {
        return new List("Map", {_lista: this, _func: func},
                        ({_lista, _func}) => {return !vazio(_lista)},
                        ({_lista, _func}) => {return _func(_lista.item);},
                        ({_lista, _func}) => {return {_lista: _lista.next, _func: _func}},);
    }

    filter(func)
    {
        return new List("Filter",{_lista: {next: this}, _func: func},
                        ({_lista, _func}) => {return !vazio(_lista)},
                        ({_lista, _func}) => {
                            while(!vazio(_lista.next) && !_func(_lista.next.item))
                                _lista.next = _lista.next.next;
                            return _lista.next.item;
                        },
                        ({_lista, _func}) => {return {_lista: {next: _lista.next.next}, _func: _func}});
    }

    displayNow()
    {
        this.display();
        if(!vazio(this))
            this.next.displayNow();
    }
}


function vazio(lista) {return lista.item === exit}

function id(func)
{
    if(func === undefined) return (item) => {return item};
    return (item) => {
        func(item);
        return item;
    };
}

function num(n1, n2)
{
    if(n2 === undefined) return new List("Num", n1,id(),(_args)=>{return true;},(_args)=>{return _args+1;});
    return new List("Num", n1,(_args)=>{return _args < n2;},id(),(_args)=>{return _args+1;});
}

function residue(m) {return (n) => {return n%m === 0}}

function siege(lista_num,lista_filtro)
{
    return new List({_lista_num: lista_num,_lista_filtro: lista_filtro},
                    ({_lista_num: lista_num,_lista_filtro: lista_filtro}) => {
                        if(lista_num.item === lista_filtro.item * lista_filtro.item)
                        {

                        }
                    })
}

num(0,20).displayNow();