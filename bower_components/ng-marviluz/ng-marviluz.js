"use strict";
var MyApp = angular.module("MyApp", ["ngCookies","ngSanitize","ui.router","pascalprecht.translate","ngAnimate", "ngMaterial", "ngAnimate"]);

MyApp
    .controller("AppController", function($scope, $rootScope, Common, UserService, CompanyService, btApp, $mdSidenav, $mdMedia, $state) {

		$rootScope.fullViewMode = false;
		$rootScope.singleViewMode = false;

        UserService.getActiveUser().then(function(response){

            if (Common.isEmpty(response.error)){
                var user = response.data;

                //UserService.getSessionData().then(function(){

                //});
                $rootScope.session = {user:response.data};


                btApp.init().then(function(){
                    if (Common.isEmpty(user.company)){
                        $rootScope.singleViewMode = true;
                        Common.goTo("company/select");
                    }else{

                        CompanyService.choose({company:user.company}).then(function(response) {

                            angular.forEach($rootScope.session.user.companies, function(company){
                                if (company.uuid==$rootScope.session.user.company){
                                    $rootScope.session.user.current_company = company;
                                }
                            });

                            btApp.loadFeatures(response.data).then(function () {
                                $rootScope.fullViewMode = true;
                            });
                        });
                    }
                });

            }else{
                btApp.loadDefaults().then(function(){
                    if (!($state.current.name=="signup" || $state.current.name=="user/validate" || $state.current.name=="company/create")){
	                    $rootScope.singleViewMode = true;
                        Common.goTo("login");

                    }else{
	                    $rootScope.singleViewMode = true;
                    }
                });
            }


        });
    });

MyApp
    .factory("btApp", function($rootScope, $q, Common, $state, UserService, CompanyService, GlobalService, btFn,$timeout, $mdSidenav) {


        var factory = {

            init: function () {
                var defer = $q.defer();

                $rootScope._app = {
                    defaults:{
                        padding:"16"
                    },
                    sidebar : {
                        left: {
                            opened: true,
                            open : function(){
                                $mdSidenav('left').then(function(){
                                    $mdSidenav('left').open();
                                });
                            },
                            close : function(){
                                $mdSidenav('left').then(function(){
                                    $mdSidenav('left').close();
                                });
                            }
                        },
                        right: {
                            opened:false,
                            toogle : function(item){
                                if (this[item].selected){
                                    this.close(item);
                                }else{
                                    this.open(item);
                                }
                            },
                            close : function(item){
                                $rootScope._app.sidebar.right[item].selected = false;
                                $rootScope._app.sidebar.right["feature"].selected = false;
                                $rootScope._app.sidebar.right["notifications"].selected = false;
                                $rootScope._app.sidebar.right["user"].selected = false;
                                $rootScope._app.sidebar.right.opened = false;
                                if (!btFn.checkScreen("gt-lg")){
                                    $timeout(function(){
                                        $mdSidenav('right').then(function(){
                                            $mdSidenav('right').close();
                                        });
                                    });
                                }
                            },
                            open : function(item){
                                $mdSidenav('right').then(function(){
                                    $rootScope.$watch($mdSidenav('right').isOpen, function(opened){
                                        if (!opened && !btFn.checkScreen("gt-lg")){
                                            $rootScope._app.sidebar.right.close(item);
                                        }
                                    });
                                    $mdSidenav('right').open();
                                    $rootScope._app.sidebar.right.opened = true;
                                    $rootScope._app.sidebar.right["feature"].selected = false;
                                    $rootScope._app.sidebar.right["notifications"].selected = false;
                                    $rootScope._app.sidebar.right["user"].selected = false;
                                    $rootScope._app.sidebar.right[item].selected = true;

                                });
                            },
                            load: function(feature, data, action, description){
                                this.feature = {
                                    selected:false,
                                    name:feature,
                                    items:data,
                                    action:action,
                                    description:description
                                };
                                if (btFn.checkScreen("gt-lg")){
                                    this.toogle("feature");
                                }
                            },
                            unLoad: function(feature, data){
                                this.feature = {
                                    selected:true,
                                    name:null,
                                    items:[]
                                };
                                this.toogle("feature");
                            },
                            feature: {
                                selected: false
                            },
                            notifications: {
                                selected: false
                            },
                            user: {
                                selected: false
                            }
                        }
                    },
                    feature : {
                        change: function (feature, blnNoRedirect) {
                            $rootScope.loadingFeature = true;
                            if (!btFn.checkScreen("gt-md")){
                                $rootScope._app.sidebar.left.close();
                            }
                            $rootScope._app.sidebar.right.unLoad();
                            $rootScope._app.feature.current = feature;
                            if (!blnNoRedirect){
                                btFn.goTo(feature.description);
                            }

                        }
                    }
                };
                $rootScope._fn = btFn;

                if (btFn.checkScreen("gt-md")){
                    $rootScope._app.defaults.padding = "32";
                }


                factory.loadDefaults().then(function(response){
                    defer.resolve(response);
                });




                return defer.promise;

            },
            loadDefaults: function () {
                var defer = $q.defer();


                GlobalService.getTheme("default").then(function(response){
                    $rootScope.theme = response.data;

                    GlobalService.getColor("default").then(function(response){
                        $rootScope.colors = response.data;

                        $rootScope.ready = true;



                        defer.resolve(true);
                    });

                });




                return defer.promise;

            },
            loadFeatures: function (features) {
                var defer = $q.defer();
                alert(features);

                //features.push({"uuid": "2d8e184d-5ae0-4044-ba3c-3a018358a811","description": "main","order": 1});
                $rootScope.session.features = [];
                $rootScope._app.feature.dict = {};

                var currentPath;
                angular.forEach(features, function(feature){
                    if (!Common.isEmpty(feature)){
                        $rootScope.session.features.push(feature);
                        $rootScope._app.feature.dict[feature.description] = feature;
                        currentPath = $state.current.name.split("/");
                        currentPath = currentPath[0];
                        if (currentPath==feature.description){
                            $rootScope._app.feature.change(feature, true);
                        }
                    }

                });




                defer.resolve(true);


                return defer.promise;

            }
        };
        return factory;

    });



MyApp
    .factory("btFn", function($rootScope, $q,$state, Common, UserService, CompanyService,$mdMedia,$mdToast, GlobalService, $translate, $timeout) {


        var factory = {

            getTranslation: function (str) {
                var translation = $translate.instant(str);
                if (str==translation){
                    translation = $translate.instant(str+".description");
                }
                if (typeof(translation)=="object"){
                    translation = translation.description;
                }else{
                    translation = translation;
                }
                return translation;

            },
            changeCompany : function(intIndex) {
                $rootScope.session.menus = $rootScope.session.companies[intIndex].menus;
                $rootScope.session.company = $rootScope.session.companies[intIndex];
                $("#modal-companies-close").trigger("click");
                $scope.toggleDialog();
                $location.path('home');

            },
            changeMenu : function(menu) {
                $rootScope.session.menu = menu;
                $location.path(menu.url);
            },
            changeLanguage : function (key) {
                $translate.use(key);
            },
            toggleDialog : function(strDialog){
                if ($rootScope.dialogCompany){
                    $rootScope.dialogCompany = false;
                }else{
                    $rootScope.dialogCompany = true;
                }

                //var d = document.querySelector("#" + strDialog);
                //d.toggle();
            },
            changeViewMode : function(mode){
                if (mode=="simple_item"){
                    $rootScope.session.currentFeature.viewMode = "card";
                }else if (mode=="post_card"){
                    $rootScope.session.currentFeature.viewMode = "simple_item";
                }else{
                    $rootScope.session.currentFeature.viewMode = "post_card";
                }
                $timeout(function(){
                    $rootScope.$apply();
                });
            },
            checkScreen : function(screen){
                return $mdMedia(screen);
            },
            goTo : function (url, data){
                if (!data){
                    data = {};
                }
                $state.transitionTo(url, data, {reload: true});
            },
            getLetterByIndex : function (index){
                return(String.fromCharCode(index+64));
            },
            range : function(n) {
                return new Array(n);
            },
            closeToast : function(){
                $mdToast.hide();
            },
            limitString :function(str, length){
                if (str.length>length){
                    return str.substring(0,length-3)+"...";
                }
                return str;
            },
            stripTags : function(str){
                return $("<div/>").html(str).text();
            },
            search : function(value) {
                $(".filterable").each(function () {
                    if ($(this).text().indexOf($("#txtSearch").val()) > -1) {
                        $(this).parent().show();
                    } else {
                        $(this).parent().hide();
                    }
                });
            },
            getObjectByString: function(obj, text){
                var arr = text.split(".");
                for (var x=0; x<arr.length ; x++){
                    obj = obj[arr[x]];
                }
                return obj;
            }
        };

        return factory;

    });
