// Generated by CoffeeScript 1.10.0
(function() {
  var app, client, dbg, er, opts, rtcConfig, trackers;

  trackers = [['wss://tracker.btorrent.xyz']];

  opts = {
    announce: trackers
  };

  rtcConfig = {
    "iceServers": [
      {
        "url": "stun:23.21.150.121",
        "urls": "stun:23.21.150.121"
      }, {
        "url": "stun:stun.l.google.com:19302",
        "urls": "stun:stun.l.google.com:19302"
      }, {
        "url": "stun:stun1.l.google.com:19302",
        "urls": "stun:stun1.l.google.com:19302"
      }, {
        "url": "stun:stun2.l.google.com:19302",
        "urls": "stun:stun2.l.google.com:19302"
      }, {
        "url": "stun:stun3.l.google.com:19302",
        "urls": "stun:stun3.l.google.com:19302"
      }, {
        "url": "stun:stun4.l.google.com:19302",
        "urls": "stun:stun4.l.google.com:19302"
      }, {
        "url": "turn:global.turn.twilio.com:3478?transport=udp",
        "urls": "turn:global.turn.twilio.com:3478?transport=udp",
        "username": "857315a4616be37252127d4ff924c3a3536dd3fa729b56206dfa0e6808a80478",
        "credential": "EEEr7bxx8umMHC4sOoWDC/4MxU/4JCfL+W7KeSJEsBQ="
      }, {
        "url": "turn:numb.viagenie.ca",
        "urls": "turn:numb.viagenie.ca",
        "credential": "webrtcdemo",
        "username": "louis%40mozilla.com"
      }
    ]
  };

  client = new WebTorrent({
    rtcConfig: rtcConfig
  });

  dbg = function(string, torrent, color) {
    color = color != null ? color : '#333333';
    if (window.localStorage.getItem('debug') != null) {
      if ((torrent != null) && torrent.name) {
        console.debug('%cβTorrent:torrent:' + torrent.name + ' (' + torrent.infoHash + ') %c' + string, 'color: #33C3F0', 'color: ' + color);
        return;
      } else {
        console.debug('%cβTorrent:client %c' + string, 'color: #33C3F0', 'color: ' + color);
        return;
      }
    }
  };

  er = function(err, torrent) {
    return dbg(err, torrent, '#FF0000');
  };

  app = angular.module('bTorrent', ['ui.grid', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ngFileUpload', 'ngNotify'], [
    '$compileProvider', '$locationProvider', function($compileProvider, $locationProvider) {
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|magnet|blob|javascript):/);
      return $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
      }).hashPrefix('#');
    }
  ]);

  app.controller('bTorrentCtrl', [
    '$scope', '$http', '$log', '$location', 'ngNotify', function($scope, $http, $log, $location, ngNotify) {
      var updateAll;
      $scope.client = client;
      $scope.seedIt = true;
      $scope.client.validTorrents = [];
      $scope.columns = [
        {
          field: 'name',
          cellTooltip: true,
          minWidth: '200'
        }, {
          field: 'length',
          name: 'Size',
          cellFilter: 'pbytes',
          width: '80'
        }, {
          field: 'received',
          displayName: 'Downloaded',
          cellFilter: 'pbytes',
          width: '135'
        }, {
          field: 'downloadSpeed()',
          displayName: '↓ Speed',
          cellFilter: 'pbytes:1',
          width: '100'
        }, {
          field: 'progress',
          displayName: 'Progress',
          cellFilter: 'progress',
          width: '100'
        }, {
          field: 'timeRemaining',
          displayName: 'ETA',
          cellFilter: 'humanTime',
          width: '150'
        }, {
          field: 'uploaded',
          displayName: 'Uploaded',
          cellFilter: 'pbytes',
          width: '125'
        }, {
          field: 'uploadSpeed()',
          displayName: '↑ Speed',
          cellFilter: 'pbytes:1',
          width: '100'
        }, {
          field: 'numPeers',
          displayName: 'Peers',
          width: '80'
        }, {
          field: 'ratio',
          cellFilter: 'number:2',
          width: '80'
        }
      ];
      $scope.gridOptions = {
        columnDefs: $scope.columns,
        data: $scope.client.validTorrents,
        enableColumnResizing: true,
        enableColumnMenus: false,
        enableRowSelection: true,
        enableRowHeaderSelection: false,
        multiSelect: false
      };
      updateAll = function() {
        if ($scope.client.processing) {
          return;
        }
        $scope.$apply();
      };
      setInterval(updateAll, 500);
      $scope.gridOptions.onRegisterApi = function(gridApi) {
        $scope.gridApi = gridApi;
        return gridApi.selection.on.rowSelectionChanged($scope, function(row) {
          if (!row.isSelected && ($scope.selectedTorrent != null) && ($scope.selectedTorrent.infoHash = row.entity.infoHash)) {
            return $scope.selectedTorrent = null;
          } else {
            return $scope.selectedTorrent = row.entity;
          }
        });
      };
      $scope.seedFile = function(file) {
        if (file != null) {
          dbg('Seeding file ' + file.name);
          $scope.client.processing = true;
          $scope.client.seed(file, opts, $scope.onSeed);
        }
      };
      $scope.openTorrentFile = function(file) {
        if (file != null) {
          dbg('Adding torrent file ' + file.name);
          $scope.client.processing = true;
          return $scope.client.add(file, opts, $scope.onTorrent);
        }
      };
      $scope.client.on('error', function(err, torrent) {
        $scope.client.processing = false;
        ngNotify.set(err, 'error');
        return er(err, torrent);
      });
      $scope.addMagnet = function() {
        if ($scope.torrentInput !== '') {
          dbg('Adding magnet/hash ' + $scope.torrentInput);
          $scope.client.processing = true;
          $scope.client.add($scope.torrentInput, opts, $scope.onTorrent);
          $scope.torrentInput = '';
        }
      };
      $scope.destroyedTorrent = function(err) {
        $scope.client.processing = false;
        if (err) {
          throw err;
        }
        dbg('Destroyed torrent');
      };
      $scope.onTorrent = function(torrent, isSeed) {
        $scope.client.validTorrents.push(torrent);
        torrent.safeTorrentFileURL = torrent.torrentFileURL;
        torrent.fileName = torrent.name + '.torrent';
        if (!isSeed) {
          $scope.client.processing = false;
        }
        if (!($scope.selectedTorrent != null) || isSeed) {
          $scope.selectedTorrent = torrent;
        }
        torrent.files.forEach(function(file) {
          file.getBlobURL(function(err, url) {
            if (err) {
              throw err;
            }
            if (isSeed) {
              dbg('Started seeding', torrent);
              $scope.client.processing = false;
            }
            file.url = url;
            if (!isSeed) {
              dbg('Finished downloading file ' + file.name, torrent);
            }
          });
          if (!isSeed) {
            dbg('Received file ' + file.name + ' metadata', torrent);
          }
        });
        torrent.on('download', function(chunkSize) {
          if (!isSeed) {
            dbg('Downloaded chunk', torrent);
          }
        });
        torrent.on('upload', function(chunkSize) {
          dbg('Uploaded chunk', torrent);
        });
        torrent.on('done', function() {
          if (!isSeed) {
            dbg('Done', torrent);
            return;
          }
          torrent.update();
        });
        torrent.on('wire', function(wire, addr) {
          dbg('Wire ' + addr, torrent);
        });
      };
      $scope.onSeed = function(torrent) {
        $scope.onTorrent(torrent, true);
      };
      if ($location.hash() !== '') {
        $scope.client.processing = true;
        setTimeout(function() {
          dbg('Adding ' + $location.hash());
          return $scope.client.add($location.hash(), $scope.onTorrent);
        }, 500);
      }
    }
  ]);

  app.filter('html', [
    '$sce', function($sce) {
      return function(input) {
        $sce.trustAsHtml(input);
      };
    }
  ]);

  app.filter('pbytes', function() {
    return function(num, speed) {
      var exponent, unit, units;
      if (isNaN(num)) {
        return '';
      }
      exponent = void 0;
      unit = void 0;
      units = ['B', 'kB', 'MB', 'GB', 'TB'];
      if (num < 1) {
        return (speed ? '' : '0 B');
      }
      exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), 8);
      num = (num / Math.pow(1000, exponent)).toFixed(1) * 1;
      unit = units[exponent];
      return num + ' ' + unit + (speed ? '/s' : '');
    };
  });

  app.filter('humanTime', function() {
    return function(millis) {
      var remaining;
      if (millis < 1000) {
        return '';
      }
      remaining = moment.duration(millis / 1000, 'seconds').humanize();
      return remaining[0].toUpperCase() + remaining.substr(1);
    };
  });

  app.filter('progress', function() {
    return function(num) {
      return (100 * num).toFixed(1) + '%';
    };
  });

}).call(this);
