define([
	"dojo/_base/declare",
	"dojo/request/xhr",
	"dojo/_base/lang",
	"dojo/json"
], function(
	declare,
		xhr,
		lang,
		json
){
	//Classe para carregar e guardar as configurações do aplicativo web feitas em config.json.
	var Config = declare("Config", null, {

		carregado: false,
		CONFIG_FILE_PATH: "./config.json",

		constructor: function(){
			if( this.carregado == false){
				this.carregar(this.CONFIG_FILE_PATH);
			}
		},

		//carrega arquivo que contém as configurações no formato json
		carregar: function(pathArquivoConfig){
			xhr(pathArquivoConfig, {
				handleAs: "json",
				preventCache: true,
				sync: true
			}).then(lang.hitch(this, function(response) {
				lang.mixin(this, response);
				this.carregado = true;
			}), function(err) {
				console.log(json.stringify(err));
			});
		}

	});

	return new Config();
});