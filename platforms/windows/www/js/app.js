var app = {
    // Application variables
    longitude: null,
    latitude: null,

    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // `load`, `deviceready`, `offline`, and `online`.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },

    // deviceready Event Handler
    //
    // The scope of `this` is the event. In order to call the `receivedEvent`
    // function, we must explicity call `app.receivedEvent(...);`
    onDeviceReady: function () {
        app.receivedEvent('deviceready');

        navigator.geolocation.getCurrentPosition(app.onLocationSuccess, app.onError, { maximumAge: 3000, timeout: 10000, enableHighAccuracy: true });

        if (window.localStorage.getItem("settings") == null) {
            window.localStorage.setItem("settings", "true");
        }

        ons.setDefaultDeviceBackButtonListener(function () {
            if (navigator.notification.confirm("Biztos ki akarsz lépni?",
                    function (index) {
                        if (index == 1) {
                            navigator.app.exitApp();
                        }
                    },
                    "Kilépés"
                ));
        });
    },

    onLocationSuccess: function(position){
        this.longitude = position.coords.longitude;
        this.latitude = position.coords.latitude;
    },

    onError: function(error){
        //alert("the code is " + error.code + ". \n" + "message: " + error.message);
    },

    // Update DOM on a Received Event
    receivedEvent: function (id) {
        console.log('Received Event: ' + id);
    }

};

(function () {

    var module = angular.module('app', ['onsen']);

    module.controller("QRController", function ($scope, $http, $window, dataService) {

        $scope.scan = function () {
            cordova.plugins.barcodeScanner.scan(function (result) {
                var re = /http:\/\/davidkleiber.com\/thesis\/public\/sensor\/([0-9a-zA-Z]*)/i;
                var matches = result.text.match(re);
                var id = matches[1];
                $scope.result = result;
                $scope.id = id;
                $scope.$apply();
                $http.get('http://davidkleiber.com/thesis/public/api/sensors/' + id).success(function (data, status, headers, config) {
                    dataService.set("id", data.device_id);
                    dataService.set("name", data.name);
                    dataService.set("description", data.description);
                    dataService.set("unit", data.unit);
                    dataService.set("latitude", data.latitude);
                    dataService.set("longitude", data.longitude);
                    $scope.navigator.pushPage("sensor.html");
                }).error(function (data, status, headers, config) {
                    //$scope.token = data;
                });
            }, function (error) {
                $scope.error = error;
                $scope.$apply();
            });
        }

        ons.ready(function () {
            $scope.navigator = $window.app.navigator;
        });

    });

    module.controller("locationController", function ($scope, $rootScope, $http) {
        var map;
        var mapBounds = new google.maps.LatLngBounds();
        var userMarker = null;

        $rootScope.initMap = function() {
            if (app.latitude != null && app.longitude != null) {
                var latLong = new google.maps.LatLng(latitude, longitude);
                var zoom = 12;
            } else {
                var latLong = new google.maps.LatLng(0, 0);
                var zoom = 1;
            }

            var mapOptions = {
                center: latLong,
                zoom: zoom,
                panControl: false,
                zoomControl: false,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
        }

        $rootScope.locationListener = function() {
            var options = { maximumAge: 3000, timeout: 10000, enableHighAccuracy: true };
            navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, options);
        }

        var onLocationSuccess = function(position) {
            var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            mapBounds.extend(latLng);
            $scope.latitude = position.coords.latitude;
            $scope.longitude = position.coords.longitude;
            $scope.$apply();

            if (userMarker == null) {
                userMarker = new google.maps.Marker({
                    position: latLng,
                    map: map,
                    title: "Pozicióm",
                    icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                });
            } else {
                userMarker.setPosition(latLng);
            }

            map.fitBounds(mapBounds);
        }

        var onLocationError = function() {
            console.log("Error");
        }

        $rootScope.getSensors = function() {
            $http.get('http://davidkleiber.com/thesis/public/api/sensors').success(function (data, status, headers, config) {
                data.forEach(function(sensor){
                    var latLng = new google.maps.LatLng(sensor.latitude, sensor.longitude);
                    var marker = new google.maps.Marker({
                        position: latLng,
                        map: map,
                        title: sensor.name,
                        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    });
                    mapBounds.extend(latLng);
                });
                map.fitBounds(mapBounds);
            });
        }

        ons.ready(function () {
            if (window.localStorage.getItem("settings") == "true")
                $rootScope.initMap();
            $rootScope.locationListener();
            $rootScope.getSensors();
        });

    });

    module.controller("sensorsController", function ($scope, $rootScope, $http, dataService, $window) {

        $scope.getSensors = function () {
            $http.get('http://davidkleiber.com/thesis/public/api/sensors').success(function (data, status, headers, config) {
                $scope.token = data;
            }).error(function (data, status, headers, config) {
                $scope.token = data;
            });
        };

        $scope.openSensor = function (sensor) {
            dataService.set("id", sensor.device_id);
            dataService.set("name", sensor.name);
            dataService.set("description", sensor.description);
            dataService.set("unit", sensor.unit);
            dataService.set("latitude", sensor.latitude);
            dataService.set("longitude", sensor.longitude);

            $scope.navigator.pushPage("sensor.html");
        }

        ons.ready(function () {
            $scope.navigator = $window.app.navigator;
        });

    });

    module.controller("sensorController", function ($scope, $rootScope, dataService, $window, $http) {

        $scope.id = dataService.get("id");
        $scope.name = dataService.get("name");
        $scope.description = dataService.get("description");
        $scope.unit = dataService.get("unit");
        $scope.latitude = dataService.get("latitude");
        $scope.longitude = dataService.get("longitude");

        var latLng = new google.maps.LatLng(dataService.get("latitude"), dataService.get("longitude"));

        $rootScope.initMap = function () {
            var mapOptions = {
                center: latLng,
                zoom: 12,
                panControl: false,
                zoomControl: false,
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            var map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

            var marker = new google.maps.Marker({
                position: latLng,
                map: map,
                title: dataService.get("name"),
                icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
            });
        };

        $rootScope.statOpen = function() {
            $scope.navigator.pushPage("stat.html");
        };

        ons.ready(function () {
            if (window.localStorage.getItem("settings") == "true")
                $rootScope.initMap();
            $scope.navigator = $window.app.navigator;
        });

    });

    module.controller("statController", function($scope, $rootScope, dataService, $http) {

        $scope.id = dataService.get("id");

        $rootScope.initChart = function () {
            var values = [];
            var chart = new CanvasJS.Chart("chart", {
                zoomEnabled: true,
                title: {
                    text: dataService.get("name") + " adatok"
                },
                toolTip: {
                    shared: true
                },
                legend: {
                    verticalAlign: "top",
                    horizontalAlign: "center",
                    fontSize: 14,
                    fontWeight: "bold",
                    fontFamily: "calibri",
                    fontColor: "dimGrey"
                },
                axisX: {
                    title: "Idő",
                    titleFontSize: 15,
                    valueFormatString: "HH:mm:ss",
                    labelFontSize: 15
                },
                axisY:{
                    suffix: dataService.get("unit"),
                    includeZero: true,
                    labelFontSize: 15
                },
                data: [{
                    type: "line",
                    xValueType: "dateTime",
                    showInLegend: true,
                    color: "#2ECC71",
                    name: "Maximum " + dataService.get("name"),
                    dataPoints: values
                }],
                legend:{
                    cursor:"pointer",
                    itemclick : function(e) {
                        if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                            e.dataSeries.visible = false;
                        }
                        else {
                            e.dataSeries.visible = true;
                        }
                        chart.render();
                    }
                }
            });

            $http.get('http://davidkleiber.com/thesis/public/api/sensors/daily/' + dataService.get("id")).success(function (data, status, headers, config) {
                data.forEach(function(item) {
                    var t = item.created_at.split(/[- :]/);
                    var d = new Date(t[0], t[1]-1, t[2], t[3], t[4], t[5]);
                    values.push({
                        x: d.getTime(),
                        y: parseFloat(item.value)
                    });
                    chart.render();
                });
            }).error(function (data, status, headers, config) {
                alert("Hiba a diagram megjelenítésében!");
            });
        };

        ons.ready(function () {
            $rootScope.initChart();
        });
    });

    module.controller("settingsController", function($scope) {

        if (window.localStorage.getItem("settings") == "true") {
            $scope.isMap = true;
        } else {
            $scope.isMap = false;
        }

        $scope.clicked = function() {
            if (window.localStorage.getItem("settings") == "true") {
                window.localStorage.setItem("settings", "false");
            } else {
                window.localStorage.setItem("settings", "true");
            }
        }

    });

    module.controller("adminController", function($scope, $http) {

        $scope.login = function() {
            alert("Implement me!");
        }

    });

    module.service("dataService", function () {
        var vars = {};
        return {
            get: function (varname) {
                return vars[varname];
            },
            set: function (varname, value) {
                vars[varname] = value;
            }
        };
    });

})();