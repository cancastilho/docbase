define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/query",
    "app/config",
    "dijit/Dialog",
    "esri/config",
    "esri/map",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/FeatureLayer",
    "esri/geometry/Extent",
    "app/arcgis",
    "dijit/form/FilteringSelect",
    "dojo/store/Memory",
    "dojo/_base/array",
    "dijit/Dialog",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/graphic"
], function(
    declare,
    lang,
    on,
    $d,
    Config,
    Dialog,
    esriConfig,
    Map,
    ArcGISDynamicMapServiceLayer,
    FeatureLayer,
    Extent,
    Arcgis,
    FilteringSelect,
    Memory,
    array,
    Dialog,
    SimpleLineSymbol,
    Color,
    Graphic) {

    var App = declare("App", null, {

        CONFIG: Config,
        janela: null,
        comboBoxUbs: null,
        map: null,
        storeAbrangencia: null,
        estiloLinha: null,

        constructor: function() {
            app = this;
        },

        inicializar: function() {
            this.vincularEventosAosLinks();
            //this.inicializarJanela();
        },

        vincularEventosAosLinks: function() {
            var elementosLinks = $d("."+Config.CLASSE_PARA_PROCURA_DE_LINKS);
            for (var i = 0; i < elementosLinks.length; i++) {
                var e = elementosLinks[i];
                this.vincularEventoAoElemento(e);
            }
        },

        vincularEventoAoElemento: function(elemento) {
            on(elemento, "click", lang.hitch(this, function(evt) {
                evt.preventDefault();
                var nomeAbrangencia = evt.target.id;
                this.abrirJanela();
                var deferred = this.obterListaDeUBS();
                this.mostrarMapa();
                this.map.on("load", lang.hitch(this, function(evt) {
                    deferred.then(lang.hitch(this, function(results) {
                            this.inicializarComboboxUbs(results);
                            var featureAbrangencia = this.obterFeatureAbrangencia(nomeAbrangencia);
                            if(featureAbrangencia){
                                this.comboBoxUbs.set("Item",  featureAbrangencia);
                                var ponto = this.obterPontoCentralDaAbrangenciaSelecionada();
                                this.map.centerAndZoom(ponto, Config.ZOOM_MAPA);
                            }
                        }),
                        lang.hitch(this, function(err) {
                             this.janela.setContent(Config.MENSAGEM_ERRO_CARREGAMENTO);
                        }));
                }));
            }));
        },

        abrirJanela: function() {
            this.inicializarJanela();
            this.janela.show();
        },

        mostrarMapa: function() {
            this.map = new Map("map", {
                slider: true,
                zoom: Config.ZOOM_MAPA,
                logo:false
            });
            this.adicionaMapaBase(Config.URL_MAPABASE);
        },

        adicionaMapaBase: function(urlMapaBase) {
            //Cria mapa base
            var mapaBase = new ArcGISDynamicMapServiceLayer(urlMapaBase, {
                id: 'mapa_base'
            });
            this.map.addLayer(mapaBase);
        },

        centralizaNaAbrangencia: function(abrangencia) {
            var pontoCentralUbs = abrangencia.geometry.getCentroid();
            this.map.centerAndZoom(pontoCentralUbs, Config.ZOOM_MAPA);
            this.map.centerAt(pontoCentralUbs);
        },

        inicializarJanela: function() {
            this.janela = new Dialog({
                title: Config.TITULO,
                content: '<input id="listaUbs"><div id="map" style="width:100%; height:95%;"></div>',
                style: "width:90%; height:100%;",
                onHide: lang.hitch(this, function() {
                    if(this.map)
                      this.map.destroy();
                    if(this.janela)
                        this.janela.destroy();
                    if(this.comboBoxUbs)
                        this.comboBoxUbs.destroy();
                })
            });
        },

        obterListaDeUBS: function() {
            return Arcgis.queryTodasLinhasEColunasComGeometria(Config.URL_ABRANGENCIA);
        },

        inicializarComboboxUbs: function(results) {
            var values = [];
            var testVals = {};

            array.forEach(results.features, function(feature) {
                values.push({
                    id: feature.attributes.OBJECTID,
                    UBS: feature.attributes.UBS,
                    feature: feature
                });
            });

            this.storeAbrangencia = new Memory({
                data: values
            });
            this.comboBoxUbs = new FilteringSelect({
                id: "comboBoxUbs",
                store: this.storeAbrangencia,
                searchAttr: "UBS",
                style: "width:25%;position:relative; margin: 0 auto 10px auto;",
                queryExpr: "*${0}*", //mágica para procurar substring
                autoComplete: false,
                onChange: lang.hitch(this, this.atualizarMapa)
            }, Config.ID_LISTA_UBS);
            this.comboBoxUbs.startup();
            this.comboBoxUbs.focus();
        },

        obterFeatureAbrangencia: function(nomeAbrangencia) {
            var featuresAbrangencia = this.storeAbrangencia.query({
                UBS: nomeAbrangencia
            });
            if( featuresAbrangencia.length > 0 )
                return featuresAbrangencia[0];
            else return null;
        },

        atualizarMapa: function(){
            var ponto = this.obterPontoCentralDaAbrangenciaSelecionada();
            this.map.centerAt(ponto);
            var geometria = this.obterGeometriaDoItemSelecionado();
            this.map.on("update-end", lang.hitch(this, function(){
                this.map.graphics.clear();
                this.adicionaContornoNaArea(geometria);
            }));
        },

        obterPontoCentralDaAbrangenciaSelecionada: function(){
            var geometria = this.obterGeometriaDoItemSelecionado();
            return geometria.getCentroid();
        },

        obterGeometriaDoItemSelecionado: function(){
            var item = this.obterObjetoDoItemSelecionado(); //obtem o objeto do valor que está selecionado no combobox
            return item.feature.geometry;
        },

        obterObjetoDoItemSelecionado:function(){
            return this.comboBoxUbs.get("item");
        },

        adicionaContornoNaArea: function(geometria) {
            var estilo = this.obterEstiloDeLinha();
            var graphic = new Graphic(geometria, estilo);
            this.map.graphics.add(graphic);
        },

        obterEstiloDeLinha: function(){
            if( this.estiloLinha )
                return this.estiloLinha;

            this.estiloLinha = new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,
                new Color(Config.COR_SELECAO),
                Config.ESPESSURA_BORDA_SELECAO
            );
            return this.estiloLinha;
        }

    });

    return new App();
});
