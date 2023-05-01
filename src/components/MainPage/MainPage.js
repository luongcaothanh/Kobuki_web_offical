import React, { Component } from 'react';
import ROSLIB from "roslib";
import "./MainPage.css";
import { Container, Col, Row } from 'react-bootstrap';
import Parameters from "../Parameters/Parameters";
import Map from "../Map/Map";
import Camera from "../Camera/Camera";
import Controller from "../Controller/Controller";
import Status from "../Status/Status";
import Header from "../Header/Header";

class MainPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isConnectedWS: false,
      linearVel: 0.2,
      angularVel: 0.45,
    };
    // this.url = "ws://192.168.0.104:9090";
    this.url = "ws://localhost:9090";
    this.ros = null;
    this.cmdVel = null;

    this.connectWebsocket = this.connectWebsocket.bind(this);
    this.registerTopic = this.registerTopic.bind(this);
    this.onChangeAngularVel = this.onChangeAngularVel.bind(this);
    this.onChangeLinearVel = this.onChangeLinearVel.bind(this);
  }

  registerTopic() {
    if (this.isConnectedWS === false) {
      return;
    }
    this.cmdVel = new ROSLIB.Topic({
      ros : this.ros,
      name : '/cmd_vel_mux/keyboard_teleop',
      messageType : 'geometry_msgs/Twist'
    });
    console.log("published topic /cmd_vel_mux/keyboard_teleop");
  }

  connectWebsocket() {
    console.log("connect to " + this.url);
    this.ros = new ROSLIB.Ros({
      url: this.url,
    });
    this.ros.on("connection", () => {
      this.setState({isConnectedWS: true});
      console.log("Connected to websocket server ");
      this.registerTopic();
    });
    this.ros.on("error", (err) => {
      console.log("Error connecting to websocket server ", err);
    });
    this.ros.on("close", () => {
      this.setState({isConnectedWS: false});
      console.log("Connection to websocket server closed, try to connect after 3s");
      setTimeout(() => {
        this.connectWebsocket();
      }, 3000);
    });
  }

  // Parameters callback
  onChangeLinearVel(vel) {
    var linearVel = vel;
    linearVel = linearVel > 1 ? 1 : linearVel;
    linearVel = linearVel < 0.05 ? 0.05 : linearVel;
    console.log("Linear velocity changed: " + linearVel);
    this.setState({linearVel: linearVel});
  }

  onChangeAngularVel(vel) {
    var angularVel = vel;
    angularVel = angularVel > 1 ? 1 : angularVel;
    angularVel = angularVel < 0.05 ? 0.05 : angularVel;
    console.log("Angular velocity changed: " + angularVel);
    this.setState({angularVel: angularVel});
  }

  componentDidMount() {
    this.connectWebsocket();
  }

  render() {
    return (
      <Container fluid className="container-center">
        <Row>
          <Col>
            <Row>
              <Col>{this.state.isConnectedWS ? <Camera ros={this.ros} number={1} /> : <Camera ros={null} number={1} />}</Col>
            </Row>
            <Row>
              <Col>{this.state.isConnectedWS ? <Status ros={this.ros} /> : <Status ros={null} />}</Col>
            </Row>
            <Row>
              <Col>
                <Parameters
                  onChangeLinearVel={this.onChangeLinearVel}
                  onChangeAngularVel={this.onChangeAngularVel}
                />
              </Col>
            </Row>
          </Col>
          <Col xs={6}>
            <Row>
              <Col>{this.state.isConnectedWS && <Map ros={this.ros}/>}</Col>
            </Row>
            <Row>
              <Col>
                <Container>
                  <Header
                    isConnected={this.state.isConnectedWS}
                    ros={this.ros}
                  />
                </Container>
              </Col>
            </Row>
          </Col>
          <Col>
            <Row>
              <Col>{this.state.isConnectedWS ? <Camera ros={this.ros} number={2} /> : <Camera ros={null} number={2} />}</Col>
            </Row>
            <Row>
              <Col>{this.state.isConnectedWS ?
                <Controller ros={this.ros} linearVel={this.state.linearVel} angularVel={this.state.angularVel} /> : 
                <Controller ros={null}/>}
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default MainPage;