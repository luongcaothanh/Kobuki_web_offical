function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

import React, { Component } from 'react';
import NAV2D from './vendor/nav2d.js';
import ROS2D from './vendor/ros2d.js';
import ROSLIB from 'roslib';
import PropTypes from 'prop-types';

var Nav2d = function (_Component) {
  _inherits(Nav2d, _Component);

  function Nav2d() {
    _classCallCheck(this, Nav2d);

    return _possibleConstructorReturn(this, _Component.apply(this, arguments));
  }

  Nav2d.prototype.componentDidUpdate = function componentDidUpdate() {
    this.nav.setCommand(this.props.command);
    if (this.props.stationName) {
      this.nav.setStationName(this.props.stationName);
    }
    if (this.props.station) {
      this.nav.syncStation(this.props.station);
    }
  }

  Nav2d.prototype.componentDidMount = function componentDidMount() {
    var ros = this.props.ros || new ROSLIB.Ros({
      url: 'ws://localhost:9090'
    });
    var command = this.props.command || 'none';
    var imageRobot = this.props.imageRobot;
    var imageGoalArrow = this.props.imageGoalArrow;
    var imageStationArrow = this.props.imageStationArrow;
    var viewer = new ROS2D.Viewer({
      divID: this.props.id,
      width: this.props.width,
      height: this.props.height
    });
    this.nav = new NAV2D.OccupancyGridClientNav({
      ros: ros,
      rootObject: viewer.scene,
      viewer: viewer,
      serverName: this.props.serverName,
      imageRobot: imageRobot,
      imageGoalArrow: imageGoalArrow,
      imageStationArrow: imageStationArrow,
      command: command,
      onSetGoal: this.props.onSetGoal,
      onAddStation: this.props.onAddStation,
      onClickStation: this.props.onClickStation,
    });
  };

  Nav2d.prototype.render = function render() {
    return React.createElement('div', { id: this.props.id });
  };

  return Nav2d;
}(Component);

Nav2d.defaultProps = {
  ros: null,
  nav: null,
  id: 'nav2d',
  width: 500,
  height: 500,
  serverName: '/move_base'
};

Nav2d.propTypes = process.env.NODE_ENV !== "production" ? {
  ros: PropTypes.object,
  id: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  serverName: PropTypes.string
} : {};

export default Nav2d;