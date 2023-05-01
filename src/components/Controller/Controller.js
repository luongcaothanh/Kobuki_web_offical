import React, { Component } from "react";
import { Container, Card, Col, Row, Button } from "react-bootstrap";
import "../CommonStyle.css";
import "./Controller.css";
import { Direction } from "../Common/Common.ts";
import ROSLIB from "roslib";

const Command = [
  {
    dir: Direction.NorthWest, code: 85
  },
  {
    dir: Direction.North, code: 73
  },
  {
    dir: Direction.NorthEast, code: 79
  },
  {
    dir: Direction.West, code: 74
  },
  {
    dir: Direction.Center, code: 75
  },
  {
    dir: Direction.East, code: 76
  },
  {
    dir: Direction.SouthWest, code: 77
  },
  {
    dir: Direction.South, code: 188
  },
  {
    dir: Direction.SouthEast, code: 190
  },
];

function ControlButton(props) {
  return <Button variant="secondary" size="lg" className="button-control" onClick={props.onClick}>{props.label}</Button>
}

const arrVel = [
  [
    [1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, -1],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, -1],
    [-1, 0, 0, 0, 0, -1],
    [-1, 0, 0, 0, 0, 0],
    [-1, 0, 0, 0, 0, 1],
  ],
  [
    [1, -1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0],
    [0, -1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [-1, -1, 0, 0, 0, 0],
    [-1, 0, 0, 0, 0, 0],
    [-1, 1, 0, 0, 0, 0],
  ]
];

class Controller extends Component {
  constructor(props) {
    super(props);
    this.state = {
      keyboard_enable: false,
      radioValue: '1',
      checked: false,
    };
    this.angularVel = props.angularVel || 0;
    this.linearVel = props.linearVel || 0;
    this.ros = props.ros || null;
    this.addEventKeyboard = false;
    this.onChangeKeyboardControl = this.onChangeKeyboardControl.bind(this);
    this.onClickControlButton = this.onClickControlButton.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this.onControl = this.onControl.bind(this);
    this.cur_dir = 4; // stop
    this.cmdVel = null;
    this.mappingModeService = null;
    this.localizationModeService = null;
  }

  _handleKeyDown = (event) => {
    // console.log("pressed " + event.keyCode);
    let target = Command.find(item => {
      if (item.code === event.keyCode) {
        return item;
      }
    });
    if (target) {
      // console.log("press dir " + target.dir);
      this.onControl(0, target.dir);
    }
  }

  onChangeKeyboardControl(event) {
    console.log("change switch " + event.target.checked);
    this.setState({ keyboard_enable: event.target.checked });
    if (event.target.checked === true) {
      if (!this.addEventKeyboard) {
        console.log("Enable keyboard");
        document.addEventListener("keydown", this._handleKeyDown);
        this.addEventKeyboard = true;
      }
    } else if (event.target.checked === false) {
      if (this.addEventKeyboard) {
        console.log("Disable keyboard");
        document.removeEventListener("keydown", this._handleKeyDown);
        this.addEventKeyboard = false;
      }
    }
  }

  onControl(mode, dir) {
    this.cur_dir = dir;
    if (!this.cmdVel || this.ros == null) {
      return;
    }
    console.log("mode " + mode + " direction " + dir + " with velocity " + this.linearVel + ", " + this.angularVel);
    if (mode > 1 || mode < 0 || dir < 0 || dir > 9) {
      console.log("Invalid control");
    }
    var newVelMsg = new ROSLIB.Message({
      linear : {
        x : arrVel[mode][dir][0] * this.linearVel,
        y : arrVel[mode][dir][1] * this.linearVel,
        z : arrVel[mode][dir][2] * this.linearVel,
      },
      angular : {
        x : arrVel[mode][dir][3] * this.angularVel,
        y : arrVel[mode][dir][4] * this.angularVel,
        z : arrVel[mode][dir][5] * this.angularVel,
      }
    });
    this.cmdVel.publish(newVelMsg);
  }

  onClickControlButton(direction) {
    console.log("click " + direction);
    this.onControl(0, direction);
  }

  componentWillUnmount() {
    if (this.addEventKeyboard) {
      document.removeEventListener("keydown", this._handleKeyDown);
    }
  }

  componentDidUpdate() {
    this.angularVel = this.props.angularVel || 0;
    this.linearVel = this.props.linearVel || 0;
    if (this.ros !== this.props.ros) {
      this.ros = this.props.ros;
      if (this.ros != null) {
        this.cmdVel = new ROSLIB.Topic({
          ros : this.ros,
          name : '/cmd_vel_mux/keyboard_teleop',
          messageType : 'geometry_msgs/Twist'
        });
        var newVelMsg = new ROSLIB.Message({
          linear : {
            x : 0,
            y : 0,
            z : 0,
          },
          angular : {
            x : 0,
            y : 0,
            z : 0,
          }
        });
        this.cur_dir = 4;
        this.cmdVel.publish(newVelMsg);
      }
    }
  }

  render() {
    return (
      <Container className="box-margin">
        <Card border="secondary">
          <Card.Header style={{fontSize: "1.2rem" }}><strong>Controller</strong></Card.Header>
          <Card.Body>
            <Row>
              <Col>Keyboard Control</Col>
              <Col>
                <label className="switch">
                  <input onChange={this.onChangeKeyboardControl} checked={this.state.keyboard_enable} type="checkbox" />
                  <span className="slider round"></span>
                </label>
              </Col>
            </Row>
            <Row>
              <Col><ControlButton label="u" onClick={() => this.onClickControlButton(Direction.NorthWest)} /></Col>
              <Col><ControlButton label="i" onClick={() => this.onClickControlButton(Direction.North)} /></Col>
              <Col><ControlButton label="o" onClick={() => this.onClickControlButton(Direction.NorthEast)} /></Col>
            </Row>
            <Row>
              <Col><ControlButton label="j" onClick={() => this.onClickControlButton(Direction.West)} /></Col>
              <Col><ControlButton label="k" onClick={() => this.onClickControlButton(Direction.Center)} /></Col>
              <Col><ControlButton label="l" onClick={() => this.onClickControlButton(Direction.East)} /></Col>
            </Row>
            <Row>
              <Col><ControlButton label="m" onClick={() => this.onClickControlButton(Direction.SouthWest)} /></Col>
              <Col><ControlButton label="," onClick={() => this.onClickControlButton(Direction.South)} /></Col>
              <Col><ControlButton label="." onClick={() => this.onClickControlButton(Direction.SouthEast)} /></Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    )
  }
}

export default Controller;