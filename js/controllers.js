'use strict';

/* Controllers */


function DashboardCtrl($scope,$http) {
	$http.get('http://localhost:9200/_cluster/health').success(function(data) {
		$scope.health = data;
	});
	$http.get('http://localhost:9200/_nodes').success(function(data) {
		$scope.nodes = data.nodes;
	});
}

function NodeInfoCtrl($scope,$http,$routeParams) {
	var nodeId = $routeParams.nodeId;
	$http.get('http://localhost:9200/_nodes/' + nodeId +'?all=true').success(function(data) {
		$scope.nodes = data.nodes[$routeParams.nodeId];
	});
}

function StatsCtrl() {

}
