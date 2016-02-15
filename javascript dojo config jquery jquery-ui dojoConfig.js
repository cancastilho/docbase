var dojoConfig = { 
	packages: [
    	{ name: "app", location: location.pathname.replace(/\/[^/]+$/, '') + "." },
    	{ name: 'jquery', location: 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.1', main: 'jquery'},
    	{ name: 'jqueryUi', location: 'http://code.jquery.com/ui/1.11.4', main: 'jquery-ui'}
	 ]
};