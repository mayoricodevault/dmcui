/**
 * Created by mike.mayori on 5/9/16.
 */
App
    .controller('ClaimsController', ['$scope', '$stateParams', '$firebaseArray', '$firebaseObject', 'FBURL', '$filter','ngTableParams',
    function ($scope,  $stateParams, $firebaseArray, $firebaseObject, FBURL, $filter, ngTableParams) {


        $scope.claims = [];
        $scope.user = {
            name : 'root',
            id : 1010
        };

        var ref = new Firebase(FBURL);
        $scope.claims = $firebaseArray(ref.child('claims'));
        ref.child('claimsCounter')
            .once('value', function(snapshot){
                var data = snapshot.val();
                if (data) {
                    $scope.claims.id = $filter('digits')(data+1,6);
                } else {
                    $scope.claims.id = '000001';
                }
            });

        // get the model
        if($stateParams.id) {
            var id = $stateParams.id;
            $scope.currentClaim = $firebaseObject(ref.child('claims').child(id));
        } else {
            $scope.currentClaim = {};
        }

        $scope.delete = function (claim) {
            if (confirm('Are you sure?')) {
                $scope.claims.$remove(claim).then(function () {
                    console.log('Claim Deleted');
                    toastr.success('Claimed Removed!', 'Claim has been removed');
                });
            }
        };
        $scope.claims.$loaded().then(function() {
            $scope.$watchCollection('claims', function(newVal, oldVal){
                if (newVal !== oldVal) {
                    $scope.tableParams.reload();
                }
            });
            $scope.$watch('searchText', function(newVal, oldVal){
                if (newVal !== oldVal) {
                    $scope.tableParams.reload();
                }
            });
            $scope.tableParams = new ngTableParams({
                page: 1,            // show first page
                count: 10,          // count per page
                sorting: {
                    id: 'asc'     // initial sorting
                }
            }, {
                total: $scope.claims.length, // length of data
                getData: function($defer, params) {
                    // use build-in angular filter
                    var claimData = params.sorting() ?
                        $filter('orderBy')($scope.claims, params.orderBy()) :
                        $scope.claims;

                    claimData	= $filter('filter')(claimData, $scope.searchText);
                    params.total(claimData.length);

                    $defer.resolve(claimData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                }
            });
        });
        $scope.ok = function(form) {
            var x = 0;
            var cb = function(filelink){
                $scope.claim.images[x] = {};
                $scope.claim.images[x].src = filelink;
                x++;
                if ($scope.claim.images.length === x) {
                    $scope.claims.$add($scope.claim).then(function (claimRef) {

                        ref.child('claimsCounter').transaction(function(currentValue) {
                            return (currentValue || 0) + 1;
                        }, function(err, committed, ss) {
                            if( err ) {
                                console.log(err);
                            }
                            else if(committed) {
                                var id = $filter('digits')(ss.val(),6);

                                ref.child('claims').child(productRef.key())
                                    .update({id: id, created_at: Firebase.ServerValue.TIMESTAMP});
                            }
                        });

                        toastr.success('Claim Added!', 'Claim has been created');
                        $state.go('claims.list', {}, {reload: true});
                    });
                }
            };

            if (form.images.$valid) {
                $scope.uploadImages($scope.claim.images, $scope.user, cb);
            }

        };
    }
])
    .controller('ClaimValidationCtrl', ['$rootScope','$scope', '$localStorage', '$window','SurveysConfig','Pubnub','_','FBURL','$firebaseArray', 'toastr','$filter','$state',
    function ($rootScope,$scope, $localStorage, $window, SurveysConfig, Pubnub, _, FBURL, $firebaseArray, toastr,  $filter, $state) {
        $scope.user = {
            name : 'root',
            id : 1010
        };
        var ref = new Firebase(FBURL);
        $scope.claims = $firebaseArray(ref.child('claims'));
        $scope.imageStrings = [];
        $scope.deleteFile = function(file) {
            console.log(file.name);
            $scope.imageStrings = _.without( $scope.imageStrings, _.findWhere( $scope.imageStrings, {name: file.name}));
        };

        $scope.survey= _.find(SurveysConfig.surveysConfig.surveys, function (item) {
            return item.categoryId === 100;
        });
        if ($scope.survey) {
            $scope.survey.latlng={};
            $scope.survey.completeAddress='';
            $scope.survey.user = $scope.user;
            $scope.survey.imageStrings =[];
        }
        $scope.processFiles = function(files){
            angular.forEach(files, function(flowFile, i){
                var fileReader = new FileReader();
                fileReader.onload = function (event) {
                    var uri = event.target.result;
                    $scope.imageStrings.push({
                        name : flowFile.name,
                        file :flowFile.file,
                        data: uri
                    });
                };
                fileReader.readAsDataURL(flowFile.file);
            });
        };

        $scope.$watch('survey', function(newValue, oldValue) {
            console.log(newValue);


        });

        $scope.position={};
        $scope.latlng={};
        $scope.currentUsersMap=null;
        $scope.completeAddress = '';
        var uuid = PUBNUB.uuid();
        var defaultInstance = Pubnub.init({
            publish_key: 'pub-c-f6817b02-abb2-46bf-b57e-b0f2aac1dbf7',
            subscribe_key: 'sub-c-3bf6f644-39f5-11e4-87bf-02ee2ddab7fe'
        });
        Pubnub.subscribe({
            channel: 'Channel-hkwogxhjp',
            triggerEvents: ['message', 'connect','presence'],
            callback: function (data) {
                $scope.currentUsersMap.addMarkers([
                    {lat: $scope.position.coords.latitude, lng: $scope.position.coords.longitude, title: uuid, animation: google.maps.Animation.DROP, infoWindow: {content: '<strong>'+uuid+'</strong>'}}
                ]);
                console.log(data);
            }
        });
        Pubnub.here_now({
            channel : 'Channel-hkwogxhjp',
            callback : function(m){
                console.log(m)
            }
        });
        var initMapGeo = function(){
            var completeStreet='', completeStreettxt='';
            var gmapGeolocation = new GMaps({
                div: '#js-map-geo',
                lat: 0,
                lng: 0,
                zoom: 11
            });

            GMaps.geolocate({
                success: function(position) {
                    $scope.position = position;
                    $scope.currentUsersMap = new GMaps({
                        div: '#js-map-geo',
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        zoom: 11,
                        scrollwheel: false
                    });
                    gmapGeolocation.setCenter(position.coords.latitude, position.coords.longitude);
                    GMaps.geocode({
                        'latLng': new google.maps.LatLng(position.coords.latitude, position.coords.longitude),
                        callback: function (results, status) {
                            if ((status === 'OK') && results) {
                                var latlng = results[0].geometry.location;
                                results = results[0].address_components;
                                completeStreet= results[0].short_name +'<br>'+ results[1].short_name +'<br>'+results[2].short_name+' ,'+results[3].short_name;
                                completeStreettxt = results[0].short_name +' ,'+results[1].short_name+' ,'+results[2].short_name+' ,'+results[3].short_name;
                                $scope.latlng = {};
                                $scope.$apply(function () {
                                    $scope.latlng = {
                                        latlng : latlng,
                                        completeAddress : completeStreettxt
                                    };
                                });

                                gmapGeolocation.addMarker({
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                    animation: google.maps.Animation.DROP,
                                    title: results[0].short_name,
                                    infoWindow: {
                                        content: '<div class="text-success"><i class="fa fa-map-marker"></i>'+ completeStreet +' <strong></strong></div>'
                                    }
                                });
                                jQuery('.js-search-address').val(completeStreettxt);
                                $scope.completeAddress = completeStreettxt;
                                initMapStreet(position.coords.latitude ,position.coords.longitude );
                                Pubnub.publish({
                                    channel: 'Channel-hkwogxhjp',
                                    message: {
                                        name: 'AUser',
                                        uuid: uuid,
                                        location: {
                                            latitude: position.coords.latitude,
                                            longitude: position.coords.longitude
                                        }
                                    }
                                });
                            } else {
                                alert('Address not found!');
                            }
                        }
                    });
                },
                error: function(error) {
                    alert('Geolocation failed: ' + error.message);
                },
                not_supported: function() {
                    alert("Your browser does not support geolocation");
                },
                always: function() {
                    // Message when geolocation succeed
                }
            });
        };
        var initValidationMaterial = function(){
            jQuery('.js-validation-material').validate({
                ignore: [],
                errorClass: 'help-block text-right animated fadeInDown',
                errorElement: 'div',
                errorPlacement: function(error, e) {
                    jQuery(e).parents('.form-group > div').append(error);
                },
                highlight: function(e) {
                    var elem = jQuery(e);

                    elem.closest('.form-group').removeClass('has-error').addClass('has-error');
                    elem.closest('.help-block').remove();
                },
                success: function(e) {
                    var elem = jQuery(e);

                    elem.closest('.form-group').removeClass('has-error');
                    elem.closest('.help-block').remove();
                },
                rules: {
                    'suggestions': {
                        required: true,
                        minlength: 10
                    }
                },
                messages: {
                    'suggestions': 'What can we do to become better?'
                }
            });
        };

        $scope.toggleSelection = function(selId) {
            var foundSurvey = _.find($scope.survey.choices, function (item) {
                if (item.id === selId) {
                    console.log('antes');
                    console.log(item);
                    item.selected = item.selected == true ? false : true;
                    return item;
                }
            });
        };

        $scope.searchGeo = function(newAddress) {
            var NewMap = GMaps.geocode({
                address: newAddress,
                callback: function (results, status) {
                    if ((status === 'OK') && results) {
                        var latlng = results[0].geometry.location;
                        $scope.currentUsersMap.removeMarkers();
                        $scope.currentUsersMap.addMarker({ lat: latlng.lat(), lng: latlng.lng() });
                        $scope.currentUsersMap.fitBounds(results[0].geometry.viewport);
                        $scope.$apply(function () {
                            $scope.latlng = {
                                latlng : latlng,
                                completeAddress : newAddress
                            };
                        });

                        initMapStreet(latlng.lat() ,latlng.lng() );
                        Pubnub.publish({
                            channel: 'Channel-hkwogxhjp',
                            message: {
                                name: 'AUser',
                                uuid: uuid,
                                location: {
                                    latitude: latlng.lat(),
                                    longitude: latlng.lng()
                                }
                            }
                        });
                    } else {
                        alert('Address not found!');
                    }
                }
            });
        };

        $scope.addClaim = function(currentUsersMap) {
            console.log(currentUsersMap);

            ref.child('claimsCounter')
                .once('value', function(snapshot){
                    var data = snapshot.val();
                    if (data) {
                        $scope.survey.cid = $filter('digits')(data+1,6);
                    } else {
                        $scope.survey.cid = '000001';
                    }
                });
            if ($scope.imageStrings.length > 0) {
                $scope.claims.$add($scope.survey).then(function (claimRef) {
                    ref.child('claimsCounter').transaction(function (currentValue) {
                        return (currentValue || 0) + 1;
                    }, function (err, committed, ss) {
                        if (err) {
                            console.log(err);
                        }
                        else if (committed) {
                            var id = $filter('digits')(ss.val(), 6);
                            ref.child('claims').child(claimRef.key())
                                .update({id: id, created_at: Firebase.ServerValue.TIMESTAMP});
                        }
                    });

                    toastr.success('Great!', 'You claim  has been submitted');
                    $state.go('claims.list', {}, {reload: true});
                });
            }

            console.log($scope.currentUsersMap.location)
            if (!currentUsersMap.location) return ;

        };

        $scope.checkLocation = function(currentUsersMap){
            if (_.isEmpty(currentUsersMap)) return true;
            if (currentUsersMap.latlng.lat()==0 && currentUsersMap.latlng.lng()==0) return true;
            if (currentUsersMap.completeAddress.length ==0 || _.isEmpty(currentUsersMap.completeAddress)) return true;
            return false;
        };

        function initMapStreet(elat,elong){
            new GMaps.createPanorama({
                el: '#js-map-street',
                lat: elat,
                lng: elong,
                pov: {heading: 340.91, pitch: 4},
                scrollwheel: false
            });
        };

        //$scope.$watch('latlng', function(newValue, oldValue) {
        //    console.log(newValue);
        //});

        initValidationMaterial();
        initMapGeo();
    }
]).service('SurveysConfig', ["$q", "$http", "$rootScope", function ($q, $http, $rootScope) {
    this.quizConfig = [];

    this.loadConfig = function loadConfig() {
        var deferred = $q.defer();

        $http.get('assets/data/surveys.json').then(
            this.onLoadConfig.bind(this, deferred),
            this.onLoadConfigError.bind(this, deferred)
        );

        return deferred.promise;
    };

    this.onLoadConfig = function (deferred, response) {

        /* JSON */
        this.surveysConfig = response.data;
        $rootScope.surveys = this.surveysConfig;

        deferred.resolve();
    };

    this.onLoadConfigError = function (deferred) {
        deferred.reject();
    };


}]);
