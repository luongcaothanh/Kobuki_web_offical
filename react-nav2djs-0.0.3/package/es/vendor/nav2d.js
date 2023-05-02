import 'latest-createjs';
import ROS2D from './ros2d';
import ROSLIB from 'roslib';

/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 */

var NAV2D = NAV2D || {
  REVISION: '0.3.0'
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A OccupancyGridClientNav uses an OccupancyGridClient to create a map for use with a Navigator.
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map meta data topic to listen to
 *   * image - the URL of the image to render
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 *   * viewer - the main viewer to render to
 */
NAV2D.ImageMapClientNav = function (options) {
  var that = this;
  options = options || {};
  this.ros = options.ros;
  var topic = options.topic || '/map_metadata';
  var image = options.image;
  this.serverName = options.serverName || '/move_base';
  this.actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
  this.rootObject = options.rootObject || new createjs.Container();
  this.viewer = options.viewer;
  this.withOrientation = options.withOrientation || false;

  this.navigator = null;

  // setup a client to get the map
  var client = new ROS2D.ImageMapClient({
    ros: this.ros,
    rootObject: this.rootObject,
    topic: topic,
    image: image
  });
  client.on('change', function () {
    that.navigator = new NAV2D.Navigator({
      ros: that.ros,
      serverName: that.serverName,
      actionName: that.actionName,
      rootObject: that.rootObject,
      withOrientation: that.withOrientation
    });

    // scale the viewer to fit the map
    that.viewer.scaleToDimensions(client.currentImage.width, client.currentImage.height);
    that.viewer.shift(client.currentImage.pose.position.x, client.currentImage.pose.position.y);
  });
};

/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Lars Kunze - l.kunze@cs.bham.ac.uk
 */

/**
 * A navigator can be used to add click-to-navigate options to an object. If
 * withOrientation is set to true, the user can also specify the orientation of
 * the robot by clicking at the goal position and pointing into the desired
 * direction (while holding the button pressed).
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 */
NAV2D.Navigator = function (options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  this.imageRobot = options.imageRobot;
  this.imageGoalArrow = options.imageGoalArrow;
  this.imageStationArrow = options.imageStationArrow;
  var serverName = options.serverName || '/move_base';
  var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
  var withOrientation = options.withOrientation || false;
  this.rootObject = options.rootObject || new createjs.Container();
  this.command = options.command || 'none';
  this.onAddStation = options.onAddStation;
  this.onClickStation = options.onClickStation;
  this.onSetGoal = options.onSetGoal;
  this.stationName = options.stationName || 'NoName';
  this.stationList = [];

  // setup the actionlib client
  var actionClient = new ROSLIB.ActionClient({
    ros: ros,
    actionName: actionName,
    serverName: serverName
  });

  /**
   * Send a goal to the navigation stack with the given pose.
   *
   * @param pose - the goal pose
   */
  function sendGoal(pose) {
    // create a goal
    var goal = new ROSLIB.Goal({
      actionClient: actionClient,
      goalMessage: {
        target_pose: {
          header: {
            frame_id: '/map'
          },
          pose: pose
        }
      }
    });
    goal.send();

    // create a marker for the goal
    var goalMarker = new ROS2D.NavigationImage({
      size: 0.5,
      image: that.imageGoalArrow,
      alpha: 0.9,
    });
    goalMarker.x = pose.position.x;
    goalMarker.y = -pose.position.y;
    goalMarker.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
    goalMarker.scaleX = 1.0 / stage.scaleX;
    goalMarker.scaleY = 1.0 / stage.scaleY;
    that.rootObject.addChild(goalMarker);

    goal.on('result', function () {
      that.rootObject.removeChild(goalMarker);
    });
  }

  // get a handle to the stage
  var stage;
  if (that.rootObject instanceof createjs.Stage) {
    stage = that.rootObject;
  } else {
    stage = that.rootObject.getStage();
  }

  // marker for the robot
  this.robotMarker = new ROS2D.NavigationImage({
    size: 1,
    image: that.imageRobot,
    alpha: 0.9,
  });
  // wait for a pose to come in first
  this.robotMarker.visible = false;
  this.robotMarker.zIndex = 0;
  this.rootObject.addChild(this.robotMarker);

  // var poseListener = new ROSLIB.Topic({
  //   ros: ros,
  //   name: '/robot_pose',
  //   messageType: 'geometry_msgs/Pose',
  //   throttle_rate: 100
  // });
  // poseListener.subscribe(function (message) {
  //   that.robotMarker.x = message.position.x;
  //   that.robotMarker.y = -message.position.y;
  //   that.robotMarker.rotation = stage.rosQuaternionToGlobalTheta(message.orientation);
  //   that.robotMarker.visible = true;
  // });

  // create a listener for the robot pose
  var poseListener = new ROSLIB.Topic({
    ros: ros,
    name: '/gazebo/model_states',
    messageType: 'gazebo_msgs/ModelStates',
    throttle_rate: 100
  });

  // subscribe to the topic and update the robot marker when a new message is received
  poseListener.subscribe(function (message) {
    // find the index of the robot in the model_states message
    var index = message.name.indexOf('mobile_base');
    if (index !== -1) {
      // update the robot marker position and orientation
      that.robotMarker.x = message.pose[index].position.x;
      that.robotMarker.y = -message.pose[index].position.y;
      that.robotMarker.rotation = stage.rosQuaternionToGlobalTheta(message.pose[index].orientation);
      that.robotMarker.visible = true;
    }
  });

  // withOrientation === true
  // setup a click-and-point listener (with orientation)
  var position = null;
  var positionVec3 = null;
  var thetaRadians = 0;
  var thetaDegrees = 0;
  var mouseDown = false;
  var mouseMove = false;
  var xDelta = 0;
  var yDelta = 0;
  var zi = 1;
  this.orientationMarkerGoal = new ROS2D.NavigationImage({
    size: 1,
    image: that.imageGoalArrow,
    alpha: 0.8,
    pulse: true,
    onload: true,
  });
  this.orientationMarkerGoal.visible = false;
  var orientationMarkerStation = null;
  var targetMarker = this.orientationMarkerGoal;

  var mouseEventHandler = function mouseEventHandler(event, mouseState) {

    if (mouseState === 'down') {
      // get position when mouse button is pressed down
      position = stage.globalToRos(event.stageX, event.stageY);
      positionVec3 = new ROSLIB.Vector3(position);
      mouseDown = true;
      mouseMove = false;

      if (that.command == 'SetGoal') {
        targetMarker = that.orientationMarkerGoal;
      } else if (that.command == 'AddStation') {
        orientationMarkerStation = new ROS2D.NavigationImage({
          size: 1,
          image: that.imageStationArrow,
          alpha: 0.8,
          pulse: true,
          onload: true,
        });
        targetMarker = orientationMarkerStation;
      } else {
        mouseDown = false;
        var currentPos = stage.globalToRos(event.stageX, event.stageY);
        var currentPosVec3 = new ROSLIB.Vector3(currentPos);
        currentPosVec3.y *= -1;
        var targetIndex = -1;
        that.stationList.forEach((item, index) => {
          if (Math.abs(currentPosVec3.x - item.marker.x) < 0.2 && Math.abs(currentPosVec3.y - item.marker.y) < 0.2) {
            if (that.onClickStation) {
              that.onClickStation(item.info.id);
            }
          }
        });
        if (targetIndex >= 0) {
          that.stationList.splice(targetIndex, 1);
        }
        return;
      }
    } else if (mouseDown && mouseState === 'move') {
      // remove obsolete orientation marker
      that.rootObject.removeChild(targetMarker);
      mouseMove = true;
      var currentPos = stage.globalToRos(event.stageX, event.stageY);
      var currentPosVec3 = new ROSLIB.Vector3(currentPos);
      targetMarker.visible = true;

      xDelta = currentPosVec3.x - positionVec3.x;
      yDelta = currentPosVec3.y - positionVec3.y;

      thetaRadians = Math.atan2(xDelta, yDelta);

      thetaDegrees = thetaRadians * (180.0 / Math.PI);

      if (thetaDegrees >= 0 && thetaDegrees <= 180) {
        thetaDegrees += 270;
      } else {
        thetaDegrees -= 90;
      }

      targetMarker.x = positionVec3.x;
      targetMarker.y = -positionVec3.y;
      targetMarker.rotation = thetaDegrees;
      targetMarker.zIndex = zi;
      zi++;

      that.rootObject.addChildAt(targetMarker, that.rootObject.getChildIndex(that.robotMarker));
    } else if (mouseDown && mouseState === 'up') {
      mouseDown = false;

      var goalPos = stage.globalToRos(event.stageX, event.stageY);

      var goalPosVec3 = new ROSLIB.Vector3(goalPos);

      xDelta = goalPosVec3.x - positionVec3.x;
      yDelta = goalPosVec3.y - positionVec3.y;

      thetaRadians = Math.atan2(xDelta, yDelta);

      if (thetaRadians >= 0 && thetaRadians <= Math.PI) {
        thetaRadians += 3 * Math.PI / 2;
      } else {
        thetaRadians -= Math.PI / 2;
      }

      var qz = Math.sin(-thetaRadians / 2.0);
      var qw = Math.cos(-thetaRadians / 2.0);

      var orientation = new ROSLIB.Quaternion({ x: 0, y: 0, z: qz, w: qw });

      var pose = new ROSLIB.Pose({
        position: positionVec3,
        orientation: orientation
      });
      // send the goal
      // sendGoal(pose);
      if (mouseMove) {
        mouseMove = false;
        if (that.command == 'SetGoal') {
          if (that.onSetGoal) {
            that.onSetGoal(that.rootObject, targetMarker, pose);
          }
        } else if (that.command == 'AddStation') {
          that.rootObject.removeChild(targetMarker);
          if (that.onAddStation) {
            let newStation = {
              name: that.stationName,
              positionX: pose.position.x,
              positionY: pose.position.y,
              positionZ: pose.position.z,
              orientationX: pose.orientation.x,
              orientationY: pose.orientation.y,
              orientationZ: pose.orientation.z,
              orientationW: pose.orientation.w,
              id: Date.now().toString(),
            }
            that.onAddStation(newStation);
          }
        }
      }
    }
  };

  this.rootObject.addEventListener('stagemousedown', function (event) {
    mouseEventHandler(event, 'down');
  });

  this.rootObject.addEventListener('stagemousemove', function (event) {
    mouseEventHandler(event, 'move');
  });

  this.rootObject.addEventListener('stagemouseup', function (event) {
    mouseEventHandler(event, 'up');
  });
};

NAV2D.Navigator.prototype.setCommand = function (command) {
  this.command = command;
  if (this.command == 'CancelGoal') {
    this.rootObject.removeChild(this.orientationMarkerGoal);
  }
}

NAV2D.Navigator.prototype.setStationName = function (stationName) {
  this.stationName = stationName;
}

NAV2D.Navigator.prototype.syncStation = function (station) {
  for (var i = this.stationList.length - 1; i >= 0; i--) {
    var del = true;
    for (var j = 0; j < station.length; j++) {
      if (this.stationList[i].info.id == station[j].id) {
        del = false;
      }
    }
    if (del) {
      this.rootObject.removeChild(this.stationList[i].marker);
      this.rootObject.removeChild(this.stationList[i].text);
      this.stationList.splice(i, 1);
    }
  }
  for (var i = station.length - 1; i >= 0; i--) {
    var available = false;
    for (var j = 0; j < this.stationList.length; j++) {
      if (this.stationList[j].info.id == station[i].id) {
        available = true;
      }
    }
    if (available == false) {

      var stationMarker =  new ROS2D.NavigationImage({
        size: 1,
        image: this.imageStationArrow,
        alpha: 0.8,
        pulse: true,
      });

      // get a handle to the stage
      var stage;
      if (this.rootObject instanceof createjs.Stage) {
        stage = this.rootObject;
      } else {
        stage = this.rootObject.getStage();
      }

      var orientation = new ROSLIB.Quaternion({
        x: station[i].orientationX,
        y: station[i].orientationY,
        z: station[i].orientationZ,
        w: station[i].orientationW
      });

      stationMarker.x = station[i].positionX;
      stationMarker.y = -station[i].positionY;
      stationMarker.rotation = stage.rosQuaternionToGlobalTheta(orientation);

      var text = new createjs.Text(station[i].name, "0.02rem Helvetica", "#000000");
      text.x = stationMarker.x - text.getBounds().width / 2;
      text.y = stationMarker.y - 1.5;
      this.rootObject.addChildAt(stationMarker, this.rootObject.getChildIndex(this.robotMarker));
      this.rootObject.addChildAt(text, this.rootObject.getChildIndex(this.robotMarker));
      this.stationList.push({
        info: station[i],
        marker: stationMarker,
        text: text,
      });
    }
  }
}

/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A OccupancyGridClientNav uses an OccupancyGridClient to create a map for use with a Navigator.
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic (optional) - the map topic to listen to
 *   * rootObject (optional) - the root object to add this marker to
 *   * continuous (optional) - if the map should be continuously loaded (e.g., for SLAM)
 *   * serverName (optional) - the action server name to use for navigation, like '/move_base'
 *   * actionName (optional) - the navigation action name, like 'move_base_msgs/MoveBaseAction'
 *   * rootObject (optional) - the root object to add the click listeners to and render robot markers to
 *   * withOrientation (optional) - if the Navigator should consider the robot orientation (default: false)
 *   * viewer - the main viewer to render to
 */
NAV2D.OccupancyGridClientNav = function (options) {
  var that = this;
  options = options || {};
  this.ros = options.ros;
  var topic = options.topic || '/map';
  var continuous = options.continuous;
  this.serverName = options.serverName || '/move_base';
  this.actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
  this.rootObject = options.rootObject || new createjs.Container();
  this.viewer = options.viewer;
  this.withOrientation = options.withOrientation || false;
  this.command = options.command || 'none';
  var imageRobot = options.imageRobot;
  var imageGoalArrow = options.imageGoalArrow;
  var imageStationArrow = options.imageStationArrow;

  this.navigator = null;

  // setup a client to get the map
  var client = new ROS2D.OccupancyGridClient({
    ros: this.ros,
    rootObject: this.rootObject,
    continuous: continuous,
    topic: topic,
  });
  client.on('change', function () {
    that.viewer.scaleToDimensions(client.currentGrid.width, client.currentGrid.height);
    that.viewer.shift(client.currentGrid.pose.position.x, client.currentGrid.pose.position.y);
  });
  that.navigator = new NAV2D.Navigator({
    ros: that.ros,
    serverName: that.serverName,
    actionName: that.actionName,
    rootObject: that.rootObject,
    withOrientation: true,
    imageRobot: imageRobot,
    imageGoalArrow: imageGoalArrow,
    imageStationArrow: imageStationArrow,
    command: this.command,
    onSetGoal: options.onSetGoal,
    onAddStation: options.onAddStation,
    onClickStation: options.onClickStation,
  });
};

NAV2D.OccupancyGridClientNav.prototype.setCommand = function (command) {
  this.navigator.setCommand(command);
}

NAV2D.OccupancyGridClientNav.prototype.setStationName = function (stationName) {
  this.navigator.setStationName(stationName);
}

NAV2D.OccupancyGridClientNav.prototype.syncStation = function (station) {
  this.navigator.syncStation(station);
}

export default NAV2D;