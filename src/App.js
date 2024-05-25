import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { initNotifications, notify } from '@mycv/f8-notification';
import '@tensorflow/tfjs-backend-cpu';
import { Howl } from 'howler';
import soundURL from './assets/hey_sondn.mp3';
import Notification from './Notification'; // Import the Notification component
const mobilenet = require('@tensorflow-models/mobilenet');
const knnClassifier = require('@tensorflow-models/knn-classifier');

var sound = new Howl({
  src: [soundURL]
});

const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 10;
const TOUCHED_CONFIDENCE = 0.8;

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);
  const [notification, setNotification] = useState(''); // State for notification message

  const init = async () => {
    setNotification('Initializing...');
    await setupCamera();
    setNotification('Camera setup successful');

    // Delay before showing the next notification
    setTimeout(() => {
      setNotification('Waiting for setup...');
    }, 2000); // Adjust the delay as needed

    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenet.load();

    setNotification('Setup done. Do not touch your face and press Train 1');
    initNotifications({ cooldown: 3000 });
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      } else {
        reject();
      }
    });
  }

  const train = async label => {
    setNotification(`[${label}] Training your beautiful face...`);
    for (let i = 0; i < TRAINING_TIMES; ++i) {
      setNotification(`Training ${label}: Progress ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`);
      await training(label);
    }
    setNotification(`Training ${label} complete`);
    
    if (label === NOT_TOUCH_LABEL) {
      setTimeout(() => {
        setNotification('Now touch your face and press Train 2');
      }, 2000); // Adjust the delay as needed
    }else if (label === TOUCHED_LABEL) {
      setTimeout(() => {
        setNotification('Machine learning is done, press Run');
      }, 2000); // Adjust the delay as needed
    }
  }

  const training = label => {
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(50);
      resolve();
    });
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
    console.log('Label: ', result.label);
    console.log('Confidences: ', result.confidences);

    if (result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
    ) {
      setNotification('You are touching your face');
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      setTouched(true);
    } else {
      setTouched(false);
    }

    await sleep(80);

    run();
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() => {
    init();

    sound.on('end', function () {
      canPlaySound.current = true;
    });

    //cleanup
    return () => {

    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video className="video"
        autoPlay
        ref={video}>
      </video>

      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1</button>
        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2</button>
        <button className="btn" onClick={() => run()}>Run</button>
      </div>

      {/* Notification component */}
      <Notification message={notification} />
    </div>
  );
}

export default App;
