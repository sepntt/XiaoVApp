import React, {Component} from 'react';

import {
  AppRegistry,
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  Platform,
  PermissionsAndroid,
  Image,
  ScrollView
} from 'react-native';

import Sound from 'react-native-sound';
import {AudioRecorder, AudioUtils} from 'react-native-audio';

class App extends Component {

    state = {
      currentTime: 0.0,
      recording: false,
      paused: false,
      stoppedRecording: false,
      finished: false,
      audioPath: AudioUtils.MusicDirectoryPath + '/aac.aac',//DocumentDirectoryPath 貌似找不到，先用公共的music目录，ios可能也要调整
      // audioPath: AudioUtils.DocumentDirectoryPath + '/aac.aac',
      hasPermission: undefined,
    };

    prepareRecordingPath(audioPath){
      AudioRecorder.prepareRecordingAtPath(audioPath, {
        SampleRate: 22050,
        Channels: 1,
        AudioQuality: "Low",
        AudioEncoding: "aac",
        AudioEncodingBitRate: 32000
      });
    }

    componentDidMount() {
      this._checkPermission().then((hasPermission) => {
        this.setState({ hasPermission });

        if (!hasPermission) return;

        this.prepareRecordingPath(this.state.audioPath);

        AudioRecorder.onProgress = (data) => {
          this.setState({currentTime: Math.floor(data.currentTime)});
        };

        AudioRecorder.onFinished = (data) => {
          // Android callback comes in the form of a promise instead.
          if (Platform.OS === 'ios') {
            this._finishRecording(data.status === "OK", data.audioFileURL);
          }
        };
      });
    }

    _checkPermission() {
      if (Platform.OS !== 'android') {
        return Promise.resolve(true);
      }

      const rationale = {
        'title': 'Microphone Permission',
        'message': 'AudioExample needs access to your microphone so you can record audio.'
      };

      return PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, rationale)
        .then((result) => {
          console.log('Permission result:', result);
          return (result === true || result === PermissionsAndroid.RESULTS.GRANTED);
        });
    }

    _renderButton(title, onPress, active) {
      var style = (active) ? styles.activeButtonText : styles.buttonText;

      return (
        <TouchableHighlight style={styles.button} onPress={onPress}>
          <Text style={style}>
            {title}
          </Text>
        </TouchableHighlight>
      );
    }

    _renderPauseButton(onPress, active) {
      var style = (active) ? styles.activeButtonText : styles.buttonText;
      var title = this.state.paused ? "RESUME" : "PAUSE";
      return (
        <TouchableHighlight style={styles.button} onPress={onPress}>
          <Text style={style}>
            {title}
          </Text>
        </TouchableHighlight>
      );
    }

    async _pause() {
      if (!this.state.recording) {
        console.warn('Can\'t pause, not recording!');
        return;
      }

      try {
        const filePath = await AudioRecorder.pauseRecording();
        this.setState({paused: true});
      } catch (error) {
        console.error(error);
      }
    }

    async _resume() {
      if (!this.state.paused) {
        console.warn('Can\'t resume, not paused!');
        return;
      }

      try {
        await AudioRecorder.resumeRecording();
        this.setState({paused: false});
      } catch (error) {
        console.error(error);
      }
    }

    async _stop() {
      console.log('_record stop')
      if (!this.state.recording) {
        console.warn('Can\'t stop, not recording!');
        return;
      }

      this.setState({stoppedRecording: true, recording: false, paused: false});

      try {
        const filePath = await AudioRecorder.stopRecording();

        if (Platform.OS === 'android') {
          this._finishRecording(true, filePath);
        }
        console.log(AudioUtils)
        this._upload(filePath);
        return filePath;
      } catch (error) {
        console.error(error);
      }
    }

    async _play() {
      console.log('play')
      if (this.state.recording) {
        await this._stop();
      }

      // These timeouts are a hacky workaround for some issues with react-native-sound.
      // See https://github.com/zmxv/react-native-sound/issues/89.
      setTimeout(() => {
        var sound = new Sound(this.state.audioPath, '', (error) => {
          if (error) {
            console.log('failed to load the sound', error);
          }
        });

        setTimeout(() => {
          sound.play((success) => {
            if (success) {
              console.log('successfully finished playing');
            } else {
              console.log('playback failed due to audio decoding errors');
            }
          });
        }, 100);
      }, 100);
    }

    async _record() {
      console.log('_record start')
      if (this.state.recording) {
        console.warn('Already recording!');
        return;
      }

      if (!this.state.hasPermission) {
        console.warn('Can\'t record, no permission granted!');
        return;
      }

      if(this.state.stoppedRecording){
        this.prepareRecordingPath(this.state.audioPath);
      }

      this.setState({recording: true, paused: false});

      try {
        const filePath = await AudioRecorder.startRecording();
      } catch (error) {
        console.error(error);
      }
    }

    _finishRecording(didSucceed, filePath) {
      this.setState({ finished: didSucceed });
      console.log(`Finished recording of duration ${this.state.currentTime} seconds at path: ${filePath}`);
    }

    async _upload(filePath) {
      console.log('_upload' + filePath)
      var formData = new FormData();
      let type = "audio/mp4";
      let name = "aac.aac";
      let url = 'http://172.24.18.52/index.php';
      formData.append("name", 'aac.aac');
      // formData.append("success_action_status", "200");
      formData.append("file",{uri: 'file:///'+filePath, type: type, name: name});
      //注意uri的地址必须要带上 file:/// 否则formdata找不到文件
      console.log(url)
      console.log(formData)

      fetch(url, {  
        method:'POST',  
        headers:{
            // 'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Content-Type' : 'multipart/form-data;',

        },  
        body:formData,  
      })  
      .then((response) => response.text() )  
      .then((responseData)=>{  
      
        console.log('responseData',responseData);  
      })  
      .catch((error)=>{console.error('error',error)});  
      

    }

    render() {
      console.log(this.state.audioPath)
      return (
        <ScrollView style={styles.container}>
          <View style={styles.controls}>
            <Image style={styles.ImgLogo} source={require('./logo.png')}/>
            <Text style={styles.TextTitle}>Hi, I Am XiaoV</Text>
            {this._renderButtOnPress("RECORD", () => {this._record()}, () => {this._stop()}, this.state.recording )}

            <Text style={styles.progressText}>{this.state.currentTime}s</Text>
            <Image style={styles.ImgRecord} source={require('./logo.png')} onPressIn={this._record()} onPressOut={this._stop()}/>

          </View>
        </ScrollView>
      );
    }
                /*{this._renderButton("PLAY", () => {this._play()} )}
            {this._renderButton("STOP", () => {this._stop()} )}
            {{this._renderButton("PAUSE", () => {this._pause()} )}}
            {this._renderPauseButton(() => {this.state.paused ? this._resume() : this._pause()})}*/

    _renderButtOnPress(title, onPressIn, onPressOut, active) {
      var style = (active) ? styles.activeButtonText : styles.buttonText;

      return (
        <TouchableHighlight style={styles.button} onPressIn={onPressIn} onPressOut={onPressOut}>
          <Text style={style}>
            {title}
          </Text>
        </TouchableHighlight>
      );
    }
  }

  var styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: "#E9F7FD",
    },
    controls: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    ImgLogo: {
      marginTop: 20,
      width: 100,
      height: 100,
    },
    TextTitle: {
      color: "#000",
      fontSize: 20
    },
    progressText: {
      paddingTop: 50,
      fontSize: 10,
      color: "#fff"
    },
    ImgRecord: {
      marginTop: 30,
      width: 30,
      height: 30,
    },
    button: {
      padding: 20
    },
    disabledButtonText: {
      color: '#eee'
    },
    buttonText: {
      fontSize: 20,
      color: "#fff"
    },
    activeButtonText: {
      fontSize: 20,
      color: "#B81F00"
    }

  });

export default App;