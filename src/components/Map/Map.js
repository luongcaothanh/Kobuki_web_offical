import React, { Component } from "react";
import { Container, Card, Button, Form, Row, Col, Alert, Modal } from "react-bootstrap";
import ROSLIB from "roslib";
import Nav2d from "react-nav2djs";
import "./Map.css";
import "../CommonStyle.css";

class Map extends Component {
  constructor(props) {
    super(props);
    this.ros = props.ros || null;
    this.state = {
      command: 'none',
      message: 'Robot is ready !',
      stationName: 'NoName',
      enableCancel: false,
      stations: [],
      goal: null,
      showModal: false,
    }
    this.onAddStation = this.onAddStation.bind(this);
    this.onClickStation = this.onClickStation.bind(this);
    this.onSetGoal = this.onSetGoal.bind(this);
    this.cancelGoal = this.cancelGoal.bind(this);
    this.actionClient = null;
    this.InsertStationService = null;
    this.DeleteStationService = null;
    this.GetStationService = null;
  }

  componentDidMount() {
    if (this.props.ros != null) {
      this.ros = this.props.ros;
      var serverName = this.props.serverName || '/move_base';
      var actionName = this.props.actionName || 'move_base_msgs/MoveBaseAction';
      this.actionClient = new ROSLIB.ActionClient({
        ros: this.ros,
        actionName: actionName,
        serverName: serverName
      });
      this.InsertStationService = new ROSLIB.Service({
        ros: this.ros,
        name: '/add_station',
        serviceType: 'kobuki_ui/AddStation',
      });
      this.DeleteStationService = new ROSLIB.Service({
        ros: this.ros,
        name: '/delete_station',
        serviceType: 'kobuki_ui/DeleteStation',
      });
      this.GetStationService = new ROSLIB.Service({
        ros: this.ros,
        name: '/get_station_list',
        serviceType: 'kobuki_ui/GetStationList',
      });
      this.GetStationService.callService(null,(res) => {
        this.setState({stations: res.station_list});
      });
    }
  }

  onAddStation(newStation) {
    if (newStation) {
      var stationList = this.state.stations;
      stationList.push(newStation);
      this.setState({stations: stationList});
      console.log("added new station", newStation.name);
      var request = new ROSLIB.ServiceRequest({
        name: newStation.name,
        positionX: newStation.positionX,
        positionY: newStation.positionY,
        positionZ: newStation.positionZ,
        orientationX: newStation.orientationX,
        orientationY: newStation.orientationY,
        orientationZ: newStation.orientationZ,
        orientationW: newStation.orientationW,
        id: newStation.id,
      });
      this.InsertStationService.callService(request);
    }
  }

  onClickStation(stationId) {
    var targetIndex = -1;
    this.state.stations.forEach((item, index) => {
      if (item.id === stationId) {
        targetIndex = index;
      }
    });
    if (targetIndex >= 0) {
      if (this.state.command === 'DeleteStation') {
        console.log("remove station", this.state.stations[targetIndex].name);
        var request = new ROSLIB.ServiceRequest({
          id: this.state.stations[targetIndex].id,
        });
        this.DeleteStationService.callService(request);
        var stationList = this.state.stations;
        stationList.splice(targetIndex, 1);
        this.setState({stations: stationList});
      } else {
        console.log("Go to station", this.state.stations[targetIndex].name);
        var positionVec3 = new ROSLIB.Vector3(null);
        var orientation = new ROSLIB.Quaternion({
          x: this.state.stations[targetIndex].orientationX,
          y: this.state.stations[targetIndex].orientationY,
          z: this.state.stations[targetIndex].orientationZ,
          w: this.state.stations[targetIndex].orientationW
        });
        
        positionVec3.x = this.state.stations[targetIndex].positionX;
        positionVec3.y = this.state.stations[targetIndex].positionY;

        var pose = new ROSLIB.Pose({
          position : positionVec3,
          orientation : orientation
        });

        var goal = new ROSLIB.Goal({
          actionClient: this.actionClient,
          goalMessage: {
            target_pose: {
              header: {
                frame_id: 'map'
              },
              pose: pose,
            }
          }
        });
        this.setState({message: 'Robot is moving to station ' + this.state.stations[targetIndex].name, enableCancel: true, command: 'CancelGoal', goal: goal});
        goal.send();
        goal.on('result', () => {
          if (this.state.enableCancel === false) {
            this.setState({showModal: true});
          } else {
            this.setState({showModal: true, command: 'none', message: 'Robot is ready !', enableCancel: false});
          }
        });
      }
    }
  }

  onSetGoal(rootObject, targetMarker, pose) {
    console.log("Added new goal");
    var goal = new ROSLIB.Goal({
      actionClient: this.actionClient,
      goalMessage: {
        target_pose: {
          header: {
            frame_id: 'map'
          },
          pose: pose
        }
      }
    });
    this.setState({message: 'Robot is moving to Goal', enableCancel: true, goal: goal});
    goal.send();
    goal.on('result', () => {
      rootObject.removeChild(targetMarker);
      if (this.state.enableCancel === false) {
        this.setState({showModal: true});
      } else {
        this.setState({showModal: true, command: 'none', message: 'Robot is ready !', enableCancel: false});
      }
    });
  }

  cancelGoal() {
    this.state.goal.cancel();
  }

  render() {
    return (
      <Container className="box-margin">
        <Card border="secondary">
          <Card.Header style={{fontSize: "1.2rem" }}><strong>Map</strong></Card.Header>
          <Card.Body>
            <Container className="map-container" id="map">
              <Container className="map-controller">
                <Button className={this.state.command === "SetGoal" ? "map-button btn-color-active" : "map-button btn-color"} onClick={() => this.setState({ command: 'SetGoal', message: 'Send goal to your robot' })}>Set Goal</Button>
                <Button className={this.state.command === "AddStation" ? "map-button btn-color-active" : "map-button btn-color"} onClick={() => this.setState({ command: 'AddStation', message: 'Add new station', stationName: 'NoName' })}>Add Station</Button>
                <Button className={this.state.command === "DeleteStation" ? "map-button btn-color-active" : "map-button btn-color"} onClick={() => this.setState({ command: 'DeleteStation', message: 'Click to delete station' })}>Delete Station</Button>
                <Button className="map-button" variant='outline-warning' onClick={() => this.setState({ command: 'none', message: 'Robot is ready !' })}>Cancel</Button>
              </Container>
              <Container style={{ width: "28rem", height: "4rem" }}>
                {this.state.command === 'AddStation' &&
                  <Form onChange={(event) => this.setState({stationName: event.target.value})}>
                    <Form.Group as={Row} controlId="formHorizontalEmail">
                      <Form.Label column sm={3}>
                        Station:
                      </Form.Label>
                      <Col sm={8}>
                        <Form.Control type="text" placeholder="ex: Table" />
                      </Col>
                    </Form.Group>
                  </Form>
                }
                {this.state.command !== 'AddStation' &&
                  <Alert variant="info">{this.state.message}</Alert>
                }
              </Container>
              <Nav2d
                id='random'
                imageRobot={require('./kobuki.png')}
                imageGoalArrow={require('./arrow-red.png')}
                imageStationArrow={require('./arrow-green.png')}
                ros={this.ros}
                serverName='/move_base'
                command={this.state.command}
                onSetGoal={(obj, targetMarker, pose) => this.onSetGoal(obj, targetMarker, pose)}
                onAddStation={(newStation) => this.onAddStation(newStation)}
                onClickStation={(station) => this.onClickStation(station)}
                stationName={this.state.stationName}
                station={this.state.stations}
              />
              <Container>
                <Button
                  variant="danger"
                  disabled={this.state.enableCancel ? false : true}
                  onClick={() => {
                    this.setState({command: 'CancelGoal', message: 'Goal was canceled', enableCancel: false});
                    this.cancelGoal();
                  }}>
                  Cancel Goal
                </Button>
              </Container>
              <Modal show={this.state.showModal} onHide={() => this.setState({showModal: false})}>
                <Modal.Header closeButton>
                  <Modal.Title>{this.state.command === "CancelGoal" ? "Goal cancel" : "Goal reached"}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {this.state.command === "CancelGoal" ? "The goal has been cancelled." : "The robot has reached its destination."}
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" onClick={() => this.setState({showModal: false})}>
                    OK
                  </Button>
                </Modal.Footer>
              </Modal>
            </Container>
          </Card.Body>
        </Card>
      </Container>
    )
  }
}

export default Map;