import React, { Component } from "react";
import { Container, Card, Col, Row } from "react-bootstrap";
import ROSLIB from "roslib";
import "../CommonStyle.css";
import "./Camera.css";

var tempImage = require('./not-available.png');

class Camera extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enableCamera: false,
    };
    this.ros = props.ros || null;
    this.subCamera = null;
    this.subcribeCameraTopic = this.subcribeCameraTopic.bind(this);
    this.unsubscribeCameraTopic = this.unsubscribeCameraTopic.bind(this);
  }

  subcribeCameraTopic() {
    let id = "camera_0" + this.props.number + "_id";
    this.subCamera.subscribe(function(message) {
      document.getElementById(id).src = "data:image/jpg;base64," + message.data;
    });
  }
  unsubscribeCameraTopic() {
    let id = "camera_0" + this.props.number + "_id";
    if (this.subCamera) {
      this.subCamera.unsubscribe();
      document.getElementById(id).src = tempImage;
    }
  }

  componentDidUpdate() {
    if (this.ros == null) {
      this.ros = this.props.ros;
      this.subCamera = new ROSLIB.Topic({
        ros: this.ros,
        name: '/camera_0' + this.props.number + '/rgb/image_raw/compressed',
        messageType: 'sensor_msgs/CompressedImage'
      });
    }
  }

  render() {
    return (
      <Container className="box-margin">
        <Card border="secondary">
          <Card.Header style={{fontSize: "1.2rem" }}><strong>Camera {this.props.number}</strong></Card.Header>
          <Card.Body style={{padding: "1rem 0rem 0rem 0rem"}}>
            <Row>
              <Col>Enable Camera</Col>
              <Col>
                <label className="switch">
                  <input onChange={(event) => {
                    this.setState({enableCamera: event.target.checked});
                    if (this.state.enableCamera) this.unsubscribeCameraTopic(); else this.subcribeCameraTopic();
                  }
                  }
                  checked={this.state.enableCamera} type="checkbox"
                />
                  <span className="slider round"></span>
                </label>
              </Col>
            </Row>
            <Container className="camera-container">
              <img id={"camera_0" + this.props.number + "_id"} width={320} src={tempImage} alt="new"></img>
            </Container>
          </Card.Body>
        </Card>
      </Container>
    )
  }
}

export default Camera;