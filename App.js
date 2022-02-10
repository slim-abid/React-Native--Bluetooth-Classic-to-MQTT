import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StyleSheet, View, Text, Button, PermissionsAndroid } from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice,
  BluetoothEventType
} from 'react-native-bluetooth-classic';

import * as Mqtt from 'react-native-native-mqtt';
import { Buffer } from "buffer"


export default class App extends React.Component {

  constructor() {
    super()
    this.state = {checkPairedState:"",info: "", values: {},bondedRSSI:[] ,connected:false,polling:false,connection:false,paired:[],client:"",messages:[],device: undefined,bluetoothEnabled: true}
    this.client = new Mqtt.Client('tcp://mqtt.flespi.io:1883');
    this.client.connect({
      clientId: 'reactApp',
      username:'7yWBwW0g0mQmOVhk9Xye1JDhZSo4nn5iLRK5CyaqJQClzJtyuPCjp3pcMD7XQ26q'
    }, err => {})
    
      
  }


  initializeRead() {
    this.disconnectSubscription = RNBluetoothClassic.onDeviceDisconnected(() => this.disconnect(true));

    if (this.state.polling) {
      this.readInterval = setInterval(() => this.performRead(), 5000);
    } else {
      this.readSubscription = this.state.bondedRSSI.onDataReceived(data =>
        this.onReceivedData(data)
      );
    }
  }
  async disconnect(disconnected) {
    try {
      if (!disconnected) {
        disconnected = await this.state.bondedRSSI.disconnect();
      }

      console.log('disconnected')
      this.setState({ connection: !disconnected });
    } catch (error) {
      console.log('error ' , error)
    }

    // Clear the reads, so that they don't get duplicated
    this.uninitializeRead();
  }

  /**
   * Clear the reading functionality.
   */
  uninitializeRead() {
    if (this.readInterval) {
      clearInterval(this.readInterval);
    }
    if (this.readSubscription) {
      this.readSubscription.remove();
    }
  }
  async performRead() {
    try {
      console.log('Polling for available messages');
      let available = await this.state.bondedRSSI.available();
      console.log(`There is data available [${available}], attempting read`);

      if (available > 0) {
        for (let i = 0; i < available; i++) {
          console.log(`reading ${i}th time`);
          let data = await this.state.bondedRSSI.read();

          console.log(`Read data ${data}`);
          console.log(data);
          this.onReceivedData({ data });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
  async onReceivedData(event)  {
    console.log('received data ',event.data)
    var data = JSON.stringify(event.data);
    const buff = Buffer.from(data);
      this.client.publish('my/topic',buff)
  }
  requestLocationPermission() 
  {
   
    try {
      const granted = PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          'title': 'Example App',
          'message': 'Example App access to your location '
        }
      )
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("You can use the location")
        alert("You can use the location");
      } else {
        console.log("location permission denied")
        alert("Location permission denied");
      }
    } catch (err) {
      console.warn(err)
    }
  }
  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }
  selectDevice = (device) => {
    console.log('App::selectDevice() called with: ', device);
    this.setState({ device });
    
  }
  async componentDidMount() {
    try {
      let device = await RNBluetoothClassic.accept({}); 
    console.log('is accepting ',device)
    }
    catch {
      console.log('already in accepting state')
    }
    

    let enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if(!enabled)
    await RNBluetoothClassic.requestBluetoothEnabled()
    console.log('getting bounded devices ...')
    this.setState({checkPairedState:"Started discovering devices ..."})
    let paired = await RNBluetoothClassic.getBondedDevices();
    this.setState({paired});
    console.log( this.state.paired)
    console.log('statrting discovery for devices ...')
    let discovery = await RNBluetoothClassic.startDiscovery();
    let cancelled = await RNBluetoothClassic.cancelDiscovery();
    console.log('discovery devices ',discovery)
    const bondedRSSI = discovery.find(b => b.address === "E4:08:E7:49:9B:60");
    this.setState({bondedRSSI})
    console.log('bonded rssi ',this.state.bondedRSSI);
    if(this.state.bondedRSSI){
      console.log('preparing for connection ...')
    let  bool = await this.state.bondedRSSI.connect({CONNECTOR_TYPE: "rfcomm",
            DELIMITER: "\r",
            DEVICE_CHARSET: Platform.OS === "ios" ? 1536 : "utf-8",
            SECURE_SOCKET: false });
      if(bool){
        this.initializeRead();
        console.log('connected successfully')
      }
      else 
      console.log('could not connect to the device')
      
    }
    else 
    console.log('no available devices! ')
    this.setState({checkPairedState:"Started discovering devices ..."})

    console.log('//////////////////////////////////////')
    /*let  device = await  RNBluetoothClassic.getConnectedDevices();
    console.log('connected devices',device)*/

    
    
    //this.checkBluetootEnabled(); 
    /*let paired = await RNBluetoothClassic.getBondedDevices();
    this.setState({paired});
    console.log( this.state.paired)*/
    //RNBluetoothClassic.connect("34:14:5F:07:B5:FC")

     }
  async checkForPaired(e) {
    e.preventDefault()
    this.setState({checkPairedState:"Started discovering devices ..."})
    console.log('//////////////////////////////////////')
    console.log('getting bounded devices ...')
    let paired = await RNBluetoothClassic.getBondedDevices();
    this.setState({paired});
    console.log( this.state.paired)
    console.log('starting discovery for devices ...')
    let discovery = await RNBluetoothClassic.startDiscovery();
    let cancelled = await RNBluetoothClassic.cancelDiscovery();
    console.log('discovery devices ',discovery)
    const bondedRSSI = discovery.find(b => b.address === "E4:08:E7:49:9B:60");
    this.setState({bondedRSSI})
    console.log('bonded rssi ',this.state.bondedRSSI);
    console.log('//////////////////////////////////////')
    this.setState({checkPairedState:"Finished discovering devices ..."})
  }


  async connectToDevice(e) {
    e.preventDefault()
    if(this.state.bondedRSSI){
      console.log(this.state.bondedRSSI.name)
    let   bool = await this.state.bondedRSSI.isConnected();
    console.log('is connected ',bool)
     
       bool = await this.state.bondedRSSI.connect({CONNECTOR_TYPE: "rfcomm",
            DELIMITER: "\r",
            DEVICE_CHARSET: Platform.OS === "ios" ? 1536 : "utf-8",
            SECURE_SOCKET: false });
       this.initializeRead();
         //bool = await this.state.paired[7].disconnect();

    
    console.log('connecteeed ',bool)
    this.setState({connected:bool})

      //this.readSubscription = this.state.paired[7].onDataReceived((data) => console.log(data));
      //this.readSubscription.remove();
    }
    
  }
  async sendData(e){
    e.preventDefault;
    let sent = await this.state.bondedRSSI.write('slim-abid')
    console.log('sent ',sent)
    let read = await this.state.bondedRSSI.read();
    console.log('read ',read)
    /*let read = await this.state.bondedRSSI.available();
    console.log(read)*/
  }
  async disconnect(e){
    this.uninitializeRead();
    let disc = await this.state.bondedRSSI.disconnect()
    console.log('disconnected ',disc)
    
  }
  async checkBluetootEnabled() {
    try {
      console.log('App::componentDidMount Checking bluetooth status');
      let enabled = await RNBluetoothClassic.isBluetoothEnabled();

      console.log(`App::componentDidMount Status: ${enabled}`);
      this.setState({ bluetoothEnabled: enabled });
    } catch (error) {
      console.log('App::componentDidMount Status Error: ', error);
      this.setState({ bluetoothEnabled: false });
    }
  }
  
  componentWillUnmount() { 
   /* this.requestLocationPermission();*/
   


  }
  onStateChanged(stateChangedEvent) {
    console.log('App::onStateChanged event used for onBluetoothEnabled and onBluetoothDisabled');

    this.setState({
      bluetoothEnabled: stateChangedEvent.enabled,
      device: stateChangedEvent.enabled ? this.state.device : undefined,
    });
  }

  mqttConnection = (e) => {
    e.preventDefault();
    //const buff = Buffer.from(str, "utf-8");
    //console.log(buff)
    var data = {data : this.makeid(7)};
    var data = JSON.stringify(data);
    const buff = Buffer.from(data);
      this.client.publish('my/topic',buff)
      this.setState({messages:[...this.state.messages,data]})
      console.log(this.state.messages)
      console.log(this.client.connected) 
      if(this.client.connected)
      this.setState({client:"Client connected and message published succesfully!"})
  }
  makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}
  
  render() {
    return (
      <View> 
        
       
        <Text style={{margin:'auto',textAlign:'center'}}>{this.state.info}</Text>
        {
          this.state.devices &&
          <View>
          <Text style={{textAlign:'center',backgroundColor:'red',color:'#fff',padding:'4%'}}>These are the following devices</Text>
          {
            this.state.devices.map(item => {
              <Text>{item.name}</Text>
            })
          }
          </View>
          
        }
        <View style={{margin:'5%'}} >
          <Button onPress={(e) => {this.mqttConnection(e)}} title="Start connection"/>
        </View>
        {
          this.state.client  ?
          <View>
            <Text style={{textAlign:"center",color:"#0D1117",marginTop:"5%"}}>{this.state.client}</Text>
          </View> : <Text></Text>
        }
       
         
        <View style={{margin:'5%'}} >
          <Button  onPress={(e) => {this.mqttConnection(e)}} title="Device scan"/>
        </View>
        <View style={{margin:'5%'}} >
          <Button  onPress={(e) => {this.checkForPaired(e)}} title="Check for paired- 1"/>
        </View>
        {
          <View>
            <Text style={{textAlign:"center",color:"#0D1117",marginTop:"5%"}}>{this.state.checkPairedState}</Text>
          </View>
        }
        {
          this.state.bondedRSSI ?
          <View>
            <Text style={{textAlign:"center",color:"#0D1117",marginTop:"5%"}}>bondedRSSI: {this.state.bondedRSSI.name}</Text>
           </View>
           : <Text style={{textAlign:"center",color:"#0D1117",marginTop:"5%"}} >No devices available yet</Text>
           

        }
        <View style={{margin:'5%'}} >
          <Button  onPress={(e) => {this.connectToDevice(e)}} title="Connect to device- 2"/>
        </View>
        {
          this.state.connected ?
          <View>
            <Text style={{textAlign:"center",color:"#0D1117",marginTop:"5%"}}>Quectel connected and ready to send data</Text>
          </View> : <Text style={{textAlign:"center",color:"#0D1117",marginTop:"5%"}}>No devices connected yet</Text>

        }
        <View style={{margin:'5%'}} >
          <Button  onPress={(e) => {this.sendData(e)}} title="send to device"/>
        </View>
        <View style={{margin:'5%'}} >
          <Button  onPress={(e) => {this.disconnect(e)}} title="disconnect"/>
        </View>
        {
          this.state.connection ?
              <View style={{margin:'5%'}} >
              <Text style={{textAlign:"center",color:"#0D1117",marginTop:"5%"}}>connected succesfully ! {this.state.connection}</Text>
            </View> :
            <View style={{margin:'5%'}} >
            <Button  onPress={(e) => {this.connectToDevice(e)}} title="Connect"/>
          </View>
        }
        

      </View>
    )
  }
}

