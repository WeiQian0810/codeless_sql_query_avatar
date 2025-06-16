import React, { Suspense, useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, Loader, Environment, useFBX, useAnimations, OrthographicCamera } from '@react-three/drei';
import { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial';

import { LinearEncoding, sRGBEncoding } from 'three/src/constants';
import { LineBasicMaterial, MeshPhysicalMaterial, Vector2 } from 'three';
import ReactAudioPlayer from 'react-audio-player';

import createAnimation from './converter';
import blinkData from './blendDataBlink.json';

import * as THREE from 'three';
import axios from 'axios';
import { io } from 'socket.io-client';
const _ = require('lodash');

const host = 'http://localhost:5051';
const py_host = 'http://127.0.0.1:5000';
// const socket = io.connect(py_host); 



let globalTableData = [];

function Table({ tableData }) {
  if (!tableData || tableData.length === 0) {
    return null;
  }

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
  };

  const thStyle = {
    color: 'white',
    backgroundColor: '#0E3846',
    padding: '8px',
    textAlign: 'left',
  };

  const tdStyle = {
    backgroundColor: '#ECAB23',
    borderBottom: '1px solid black',
    padding: '8px',
    textAlign: 'left',
  };

  const columns = Object.keys(tableData[0]); // Assuming the keys of the first item represent column names

  const tableRows = tableData.map((item, index) => (
    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#ffffff' }}>
      {columns.map((column, colIndex) => (
        <td key={colIndex} style={tdStyle}>
          {item[column]}
        </td>
      ))}
    </tr>
  ));

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {columns.map((column, colIndex) => (
            <th key={colIndex} style={thStyle}>
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{tableRows}</tbody>
    </table>
  );
}

function Avatar({ avatar_url, speak, setSpeak, text, setText, setAudioSource, setTableData, playing, styles, setStyles }) {

  let gltf = useGLTF(avatar_url);
  let morphTargetDictionaryBody = null;
  let morphTargetDictionaryLowerTeeth = null;

  const [ 
    bodyTexture, 
    eyesTexture, 
    teethTexture, 
    bodySpecularTexture, 
    bodyRoughnessTexture, 
    bodyNormalTexture,
    teethNormalTexture,
    // teethSpecularTexture,
    hairTexture,
    tshirtDiffuseTexture,
    tshirtNormalTexture,
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture,
    ] = useTexture([
    "/images/body.webp",
    "/images/eyes.webp",
    "/images/teeth_diffuse.webp",
    "/images/body_specular.webp",
    "/images/body_roughness.webp",
    "/images/body_normal.webp",
    "/images/teeth_normal.webp",
    // "/images/teeth_specular.webp",
    "/images/h_color.webp",
    "/images/tshirt_diffuse.webp",
    "/images/tshirt_normal.webp",
    "/images/tshirt_roughness.webp",
    "/images/h_alpha.webp",
    "/images/h_normal.webp",
    "/images/h_roughness.webp",
  ]);

  _.each([
    bodyTexture, 
    eyesTexture, 
    teethTexture, 
    teethNormalTexture, 
    bodySpecularTexture, 
    bodyRoughnessTexture, 
    bodyNormalTexture, 
    tshirtDiffuseTexture, 
    tshirtNormalTexture, 
    tshirtRoughnessTexture,
    hairAlphaTexture,
    hairNormalTexture,
    hairRoughnessTexture
  ], t => {
    t.encoding = sRGBEncoding;
    t.flipY = false;
  });

  bodyNormalTexture.encoding = LinearEncoding;
  tshirtNormalTexture.encoding = LinearEncoding;
  teethNormalTexture.encoding = LinearEncoding;
  hairNormalTexture.encoding = LinearEncoding;

  
  gltf.scene.traverse(node => {


    if(node.type === 'Mesh' || node.type === 'LineSegments' || node.type === 'SkinnedMesh') {

      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = false;

    
      if (node.name.includes("Body")) {

        node.castShadow = true;
        node.receiveShadow = true;

        node.material = new MeshPhysicalMaterial();
        node.material.map = bodyTexture;
        // node.material.shininess = 60;
        node.material.roughness = 1.7;

        // node.material.specularMap = bodySpecularTexture;
        node.material.roughnessMap = bodyRoughnessTexture;
        node.material.normalMap = bodyNormalTexture;
        node.material.normalScale = new Vector2(0.6, 0.6);

        morphTargetDictionaryBody = node.morphTargetDictionary;

        node.material.envMapIntensity = 0.8;
        // node.material.visible = false;

      }

      if (node.name.includes("Eyes")) {
        node.material = new MeshStandardMaterial();
        node.material.map = eyesTexture;
        // node.material.shininess = 100;
        node.material.roughness = 0.1;
        node.material.envMapIntensity = 0.5;


      }

      if (node.name.includes("Brows")) {
        node.material = new LineBasicMaterial({color: 0x000000});
        node.material.linewidth = 1;
        node.material.opacity = 0.5;
        node.material.transparent = true;
        node.visible = false;
      }

      if (node.name.includes("Teeth")) {

        node.receiveShadow = true;
        node.castShadow = true;
        node.material = new MeshStandardMaterial();
        node.material.roughness = 0.1;
        node.material.map = teethTexture;
        node.material.normalMap = teethNormalTexture;

        node.material.envMapIntensity = 0.7;


      }

      if (node.name.includes("Hair")) {
        node.material = new MeshStandardMaterial();
        node.material.map = hairTexture;
        node.material.alphaMap = hairAlphaTexture;
        node.material.normalMap = hairNormalTexture;
        node.material.roughnessMap = hairRoughnessTexture;
        
        node.material.transparent = true;
        node.material.depthWrite = false;
        node.material.side = 2;
        node.material.color.setHex(0x000000);
        
        node.material.envMapIntensity = 0.3;

      
      }

      if (node.name.includes("TSHIRT")) {
        node.material = new MeshStandardMaterial();

        node.material.map = tshirtDiffuseTexture;
        node.material.roughnessMap = tshirtRoughnessTexture;
        node.material.normalMap = tshirtNormalTexture;
        node.material.color.setHex(0xffffff);

        node.material.envMapIntensity = 0.5;


      }

      if (node.name.includes("TeethLower")) {
        morphTargetDictionaryLowerTeeth = node.morphTargetDictionary;
      }

    }

  });

  const [clips, setClips] = useState([]);
  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), [gltf.scene]);

  useEffect(() => {
    setStyles({
      listener: {
        position: 'absolute',
        left: '10%', 
        top: '50%',
        width: '120px',
        height: '120px',
        visibility: 'visible'
      },
      loader: {
        display: 'none',
        zIndex: 1,
        position: 'absolute',
        left: '10%', 
        top: '50%',
        border: '16px solid #f3f3f3',
        borderRadius: '50%',
        borderTop: '16px solid #3498db',
        width: '120px',
        height: '120px',
        animation: 'spin 2s linear infinite'
      },
      area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
      text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
      speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
      area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
      label: {color: '#777777', fontSize:'0.8em'}
    })
    const socket = io('http://127.0.0.1:5000'); // Replace with your Flask server URL
    socket.on('correct', (data) => {
      console.log(data)
      setText(data.question)
    })
    socket.on('response', (data) => {
      console.log('Received message from server:', data.text);
      setStyles({
        listener: {
          position: 'absolute',
          left: '10%', 
          top: '50%',
          width: '120px',
          height: '120px',
          visibility: 'hidden'
        },
        loader: {
          zIndex: 1,
          position: 'absolute',
          left: '10%', 
          top: '50%',
          border: '16px solid #f3f3f3',
          borderRadius: '50%',
          borderTop: '16px solid #3498db',
          width: '120px',
          height: '120px',
          animation: 'spin 2s linear infinite'
        },
        area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
        text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
        speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
        area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
        label: {color: '#777777', fontSize:'0.8em'}
      })
    });
    socket.on('continueListen', (data) => {
      console.log('Received message from server:', data);
      setStyles({
        listener: {
          position: 'absolute',
          left: '10%', 
          top: '50%',
          width: '120px',
          height: '120px',
          visibility: 'visible'
        },
        loader: {
          display: 'none',
          zIndex: 1,
          position: 'absolute',
          left: '10%', 
          top: '50%',
          border: '16px solid #f3f3f3',
          borderRadius: '50%',
          borderTop: '16px solid #3498db',
          width: '120px',
          height: '120px',
          animation: 'spin 2s linear infinite'
        },
        area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
        text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
        speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
        area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
        label: {color: '#777777', fontSize:'0.8em'}
      })
    });
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      let timeoutId; 
      let speech;
      console.log(text)
      recognition.onresult = function(event) {
        const result = event.results[event.resultIndex];
        const word = result[0].transcript.trim();
        if (word !== '') {
          speech = text + word;
          setText(text + word + '... ');
        }
        // Reset the timeout
        clearTimeout(timeoutId);
        // Start a new timeout
        timeoutId = setTimeout(() => {
            recognition.stop();
        }, 1000); // Adjust the duration (in milliseconds) as needed
      };
  
      recognition.onerror = event => {
        console.error('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        console.log('Speech recognition stopped.', speech);
        axios.post(`${py_host}/start_listening`, { question: speech }, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        .then(response => {
          console.log('Start listening request successful:', response.data);
          setStyles({
            listener: {
              position: 'absolute',
              left: '10%', 
              top: '50%',
              width: '120px',
              height: '120px',
              visibility: 'hidden'
            },
            loader: {
              display:'none',
              zIndex: 1,
              position: 'absolute',
              left: '10%', 
              top: '50%',
              border: '16px solid #f3f3f3',
              borderRadius: '50%',
              borderTop: '16px solid #3498db',
              width: '120px',
              height: '120px',
              animation: 'spin 2s linear infinite'
            },
            area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
            text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
            speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
            area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
            label: {color: '#777777', fontSize:'0.8em'}
          })
          setSpeak(true);
          setText(response.data.recognized_text);
          setTableData(response.data.tableData);
          const blendData = [];
          let duration = 4.156406
          if (response.data.recognized_text.includes('average ticket size')){
            duration = 8.614625
          }

          const timeStep = 1 / 60;
          let time = 0;

          while (time <= duration) {
            // Generate blend shape values based on the talking animation
            const mouthOpenValue = Math.sin(6 * Math.PI * time / duration) * 0.5;
            const scaleFactor = 0.2;
            const jawOpenValue =
              scaleFactor * (Math.abs(Math.sin(6 * Math.PI * time / duration)) + 1) / 2;

            // Add the blendData entry for the current time
            blendData.push({
              time: time,
              blendshapes: {
                mouthOpen: mouthOpenValue,
                jawOpen: jawOpenValue,
                // Add other blend shape names and values as needed
              },
            });

            time += timeStep;
          }

          let newClips = [
            createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'),
            createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower'),
          ];

          newClips.forEach((clip) => {
            let clipAction = mixer.clipAction(clip);
            clipAction.setLoop(THREE.LoopOnce);
            clipAction.play();
          });
          let filename = host + '/audio/' + 'speech-vlfca.wav';
          console.log(filename, text)
          if (response.data.recognized_text.includes('average ticket size')){
            filename = host + '/audio/' + 'speech-u5lfz.wav'
          }
          else(
            filename = host + '/audio/' + 'speech-vlfca.wav'
          )
          console.log(filename);

          const audio = new Audio(filename);

          audio.play()
          .then(() => {
            // Audio started playing successfully
            audio.onended = () => {
              setSpeak(false);
              setStyles({
                listener: {
                  position: 'absolute',
                  left: '10%', 
                  top: '50%',
                  width: '120px',
                  height: '120px',
                  visibility: 'visible'
                },
                loader: {
                  display: 'none',
                  zIndex: 1,
                  position: 'absolute',
                  left: '10%', 
                  top: '50%',
                  border: '16px solid #f3f3f3',
                  borderRadius: '50%',
                  borderTop: '16px solid #3498db',
                  width: '120px',
                  height: '120px',
                  animation: 'spin 2s linear infinite'
                },
                area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
                text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
                speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
                area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
                label: {color: '#777777', fontSize:'0.8em'}
              })
              recognition.start()
              // axios.post(`${py_host}/start_listening`)
              // .then(response => {
              //   console.log('Start listening request successful:', response.data);
              //   setStyles({
              //     listener: {
              //       position: 'absolute',
              //       left: '10%', 
              //       top: '50%',
              //       width: '120px',
              //       height: '120px',
              //       visibility: 'hidden'
              //     },
              //     loader: {
              //       display:'none',
              //       zIndex: 1,
              //       position: 'absolute',
              //       left: '10%', 
              //       top: '50%',
              //       border: '16px solid #f3f3f3',
              //       borderRadius: '50%',
              //       borderTop: '16px solid #3498db',
              //       width: '120px',
              //       height: '120px',
              //       animation: 'spin 2s linear infinite'
              //     },
              //     area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
              //     text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
              //     speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
              //     area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
              //     label: {color: '#777777', fontSize:'0.8em'}
              //   })
              //   setSpeak(true);
              //   setText(response.data.recognized_text);
              //   setTableData(response.data.tableData);
              //   const blendData = [];
              //   const duration = 8.614625

              //   const timeStep = 1 / 60;
              //   let time = 0;

              //   while (time <= duration) {
              //     // Generate blend shape values based on the talking animation
              //     const mouthOpenValue = Math.sin(6 * Math.PI * time / duration) * 0.5;
              //     const scaleFactor = 0.2;
              //     const jawOpenValue =
              //       scaleFactor * (Math.abs(Math.sin(6 * Math.PI * time / duration)) + 1) / 2;

              //     // Add the blendData entry for the current time
              //     blendData.push({
              //       time: time,
              //       blendshapes: {
              //         mouthOpen: mouthOpenValue,
              //         jawOpen: jawOpenValue,
              //         // Add other blend shape names and values as needed
              //       },
              //     });

              //     time += timeStep;
              //   }

              //   let newClips = [
              //     createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'),
              //     createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower'),
              //   ];

              //   newClips.forEach((clip) => {
              //     let clipAction = mixer.clipAction(clip);
              //     clipAction.setLoop(THREE.LoopOnce);
              //     clipAction.play();
              //   });


              //   const filename = host + '/audio/' + 'speech-u5lfz.wav'
              //   // if (response.data.tableData!=[{'SUM(COVERAGE_COUNT)': 5076}]){
              //   //   filename = host + '/audio/' + 'speech-9ghfm.wav'
              //   // }
              //   // else(
              //   //   filename = host + '/audio/' + 'speech-vlfca.wav'
              //   // )
              //   // console.log('filename');

              //   const audio = new Audio(filename);

              //   audio.play()
              //   .then(() => {
              //     // Audio started playing successfully
              //     audio.onended = () => {
              //       setStyles({
              //         listener: {
              //           position: 'absolute',
              //           left: '10%', 
              //           top: '50%',
              //           width: '120px',
              //           height: '120px',
              //           visibility: 'visible'
              //         },
              //         loader: {
              //           display: 'none',
              //           zIndex: 1,
              //           position: 'absolute',
              //           left: '10%', 
              //           top: '50%',
              //           border: '16px solid #f3f3f3',
              //           borderRadius: '50%',
              //           borderTop: '16px solid #3498db',
              //           width: '120px',
              //           height: '120px',
              //           animation: 'spin 2s linear infinite'
              //         },
              //         area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
              //         text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
              //         speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
              //         area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
              //         label: {color: '#777777', fontSize:'0.8em'}
              //       })
              //       setSpeak(false);
              //     };
              //   })
              //   .catch(error => {
              //     // Handle error when attempting to play audio
              //     console.error('Error playing audio:', error);
              //   });
                
              // })
              // .catch(error => {
              //   console.error('Error making start listening request:', error);
              // });
            };
          })
          .catch(error => {
            // Handle error when attempting to play audio
            console.error('Error playing audio:', error);
          });
          
        })
        .catch(error => {
          console.error('Error making start listening request:', error);
        });
        // Optional: You can restart recognition here if needed
        // recognition.start();
    };

      recognition.start();
    }
    
    // axios.post(`${py_host}/start_listening`, {question: text})
    // .then(response => {
    //   console.log('Start listening request successful:', response.data);
    //   setStyles({
    //     listener: {
    //       position: 'absolute',
    //       left: '10%', 
    //       top: '50%',
    //       width: '120px',
    //       height: '120px',
    //       visibility: 'hidden'
    //     },
    //     loader: {
    //       display:'none',
    //       zIndex: 1,
    //       position: 'absolute',
    //       left: '10%', 
    //       top: '50%',
    //       border: '16px solid #f3f3f3',
    //       borderRadius: '50%',
    //       borderTop: '16px solid #3498db',
    //       width: '120px',
    //       height: '120px',
    //       animation: 'spin 2s linear infinite'
    //     },
    //     area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
    //     text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
    //     speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
    //     area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
    //     label: {color: '#777777', fontSize:'0.8em'}
    //   })
    //   setSpeak(true);
    //   setText(response.data.recognized_text);
    //   setTableData(response.data.tableData);
    //   const blendData = [];
    //   const duration = 4.156406

    //   const timeStep = 1 / 60;
    //   let time = 0;

    //   while (time <= duration) {
    //     // Generate blend shape values based on the talking animation
    //     const mouthOpenValue = Math.sin(6 * Math.PI * time / duration) * 0.5;
    //     const scaleFactor = 0.2;
    //     const jawOpenValue =
    //       scaleFactor * (Math.abs(Math.sin(6 * Math.PI * time / duration)) + 1) / 2;

    //     // Add the blendData entry for the current time
    //     blendData.push({
    //       time: time,
    //       blendshapes: {
    //         mouthOpen: mouthOpenValue,
    //         jawOpen: jawOpenValue,
    //         // Add other blend shape names and values as needed
    //       },
    //     });

    //     time += timeStep;
    //   }

    //   let newClips = [
    //     createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'),
    //     createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower'),
    //   ];

    //   newClips.forEach((clip) => {
    //     let clipAction = mixer.clipAction(clip);
    //     clipAction.setLoop(THREE.LoopOnce);
    //     clipAction.play();
    //   });
    //   const filename = host + '/audio/' + 'speech-vlfca.wav'
    //   // if (response.data.tableData!=[{'SUM(COVERAGE_COUNT)': 5076}]){
    //   //   filename = host + '/audio/' + 'speech-9ghfm.wav'
    //   // }
    //   // else(
    //   //   filename = host + '/audio/' + 'speech-vlfca.wav'
    //   // )
    //   // console.log('filename');

    //   const audio = new Audio(filename);

    //   audio.play()
    //   .then(() => {
    //     // Audio started playing successfully
    //     audio.onended = () => {
    //       setSpeak(false);
    //       setStyles({
    //         listener: {
    //           position: 'absolute',
    //           left: '10%', 
    //           top: '50%',
    //           width: '120px',
    //           height: '120px',
    //           visibility: 'visible'
    //         },
    //         loader: {
    //           display: 'none',
    //           zIndex: 1,
    //           position: 'absolute',
    //           left: '10%', 
    //           top: '50%',
    //           border: '16px solid #f3f3f3',
    //           borderRadius: '50%',
    //           borderTop: '16px solid #3498db',
    //           width: '120px',
    //           height: '120px',
    //           animation: 'spin 2s linear infinite'
    //         },
    //         area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
    //         text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
    //         speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
    //         area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
    //         label: {color: '#777777', fontSize:'0.8em'}
    //       })
    //       axios.get(`${py_host}/start_listening`)
    //       .then(response => {
    //         console.log('Start listening request successful:', response.data);
    //         setStyles({
    //           listener: {
    //             position: 'absolute',
    //             left: '10%', 
    //             top: '50%',
    //             width: '120px',
    //             height: '120px',
    //             visibility: 'hidden'
    //           },
    //           loader: {
    //             display:'none',
    //             zIndex: 1,
    //             position: 'absolute',
    //             left: '10%', 
    //             top: '50%',
    //             border: '16px solid #f3f3f3',
    //             borderRadius: '50%',
    //             borderTop: '16px solid #3498db',
    //             width: '120px',
    //             height: '120px',
    //             animation: 'spin 2s linear infinite'
    //           },
    //           area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
    //           text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
    //           speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
    //           area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
    //           label: {color: '#777777', fontSize:'0.8em'}
    //         })
    //         setSpeak(true);
    //         setText(response.data.recognized_text);
    //         setTableData(response.data.tableData);
    //         const blendData = [];
    //         const duration = 8.614625

    //         const timeStep = 1 / 60;
    //         let time = 0;

    //         while (time <= duration) {
    //           // Generate blend shape values based on the talking animation
    //           const mouthOpenValue = Math.sin(6 * Math.PI * time / duration) * 0.5;
    //           const scaleFactor = 0.2;
    //           const jawOpenValue =
    //             scaleFactor * (Math.abs(Math.sin(6 * Math.PI * time / duration)) + 1) / 2;

    //           // Add the blendData entry for the current time
    //           blendData.push({
    //             time: time,
    //             blendshapes: {
    //               mouthOpen: mouthOpenValue,
    //               jawOpen: jawOpenValue,
    //               // Add other blend shape names and values as needed
    //             },
    //           });

    //           time += timeStep;
    //         }

    //         let newClips = [
    //           createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'),
    //           createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower'),
    //         ];

    //         newClips.forEach((clip) => {
    //           let clipAction = mixer.clipAction(clip);
    //           clipAction.setLoop(THREE.LoopOnce);
    //           clipAction.play();
    //         });


    //         const filename = host + '/audio/' + 'speech-u5lfz.wav'
    //         // if (response.data.tableData!=[{'SUM(COVERAGE_COUNT)': 5076}]){
    //         //   filename = host + '/audio/' + 'speech-9ghfm.wav'
    //         // }
    //         // else(
    //         //   filename = host + '/audio/' + 'speech-vlfca.wav'
    //         // )
    //         // console.log('filename');

    //         const audio = new Audio(filename);

    //         audio.play()
    //         .then(() => {
    //           // Audio started playing successfully
    //           audio.onended = () => {
    //             setStyles({
    //               listener: {
    //                 position: 'absolute',
    //                 left: '10%', 
    //                 top: '50%',
    //                 width: '120px',
    //                 height: '120px',
    //                 visibility: 'visible'
    //               },
    //               loader: {
    //                 display: 'none',
    //                 zIndex: 1,
    //                 position: 'absolute',
    //                 left: '10%', 
    //                 top: '50%',
    //                 border: '16px solid #f3f3f3',
    //                 borderRadius: '50%',
    //                 borderTop: '16px solid #3498db',
    //                 width: '120px',
    //                 height: '120px',
    //                 animation: 'spin 2s linear infinite'
    //               },
    //               area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
    //               text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
    //               speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
    //               area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
    //               label: {color: '#777777', fontSize:'0.8em'}
    //             })
    //             setSpeak(false);
    //           };
    //         })
    //         .catch(error => {
    //           // Handle error when attempting to play audio
    //           console.error('Error playing audio:', error);
    //         });
            
    //       })
    //       .catch(error => {
    //         console.error('Error making start listening request:', error);
    //       });
    //     };
    //   })
    //   .catch(error => {
    //     // Handle error when attempting to play audio
    //     console.error('Error playing audio:', error);
    //   });
      
    // })
    // .catch(error => {
    //   console.error('Error making start listening request:', error);
    // });
    
  }, []);


  useEffect(() => {
    let isMounted = true;
    let audio = null;
    console.log(speak)
  
    if (speak === false) {
      return () => {
        // Cleanup logic if needed
        if (audio) {
          audio.pause();
          audio = null;
        }
        // axios.get(`${py_host}/start_listening`)
        // .then(response => {
        //   console.log('Start listening request successful:', response.data);
        //   setSpeak(true);
        //   setText(response.data.recognized_text)
        // })
        // .catch(error => {
        //   console.error('Error making start listening request:', error);
        // });
      };
    }


  
    // The `makeSpeech` function is a helper function that makes a POST request to a specified endpoint
    // (`host + '/talk'`) with a given text as the request payload. It is used to send text to a server
    // for speech synthesis and facial animation generation. The server processes the text and returns
    // the generated speech audio file and facial animation data.
    // makeSpeech(text)
    //   .then((response) => {
    //     if (!isMounted) {
    //       // Component is unmounted, do not proceed
    //       return;
    //     }
  
    //     console.log(response.data);
    //     let { blendData, filename, tableData } = response.data;
    //     setTableData(tableData);
    //     console.log(tableData);
    //     console.log(blendData);
  
    //     let newClips = [
    //       createAnimation(blendData, morphTargetDictionaryBody, 'HG_Body'),
    //       createAnimation(blendData, morphTargetDictionaryLowerTeeth, 'HG_TeethLower'),
    //     ];
  
    //     newClips.forEach((clip) => {
    //       let clipAction = mixer.clipAction(clip);
    //       clipAction.setLoop(THREE.LoopOnce);
    //       clipAction.play();
    //     });
  
    //     filename = host + '/audio/' + 'speech-6dfzh.wav';
    //     // console.log('filename');
  
    //     audio = new Audio(filename);

    //     audio.play()
    //     .then(() => {
    //       // Audio started playing successfully
    //       audio.onended = () => {
    //         setSpeak(false);
    //       };
    //     })
    //     .catch(error => {
    //       // Handle error when attempting to play audio
    //       console.error('Error playing audio:', error);
    //     });
    //   })
    //   .catch((err) => {
    //     console.error(err);
    //   });
  
    return () => {
      // Cleanup logic, stop any ongoing audio playback if needed
      if (audio) {
        audio.pause();
        audio = null;
      }
      isMounted = false;
    };
  }, [speak, text]);
  

  let idleFbx = useFBX('/idle.fbx');
  let { clips: idleClips } = useAnimations(idleFbx.animations);

  idleClips[0].tracks = _.filter(idleClips[0].tracks, track => {
    return track.name.includes("Head") || track.name.includes("Neck") || track.name.includes("Spine2");
  });

  idleClips[0].tracks = _.map(idleClips[0].tracks, track => {

    if (track.name.includes("Head")) {
      track.name = "head.quaternion";
    }

    if (track.name.includes("Neck")) {
      track.name = "neck.quaternion";
    }

    if (track.name.includes("Spine")) {
      track.name = "spine2.quaternion";
    }

    return track;

  });

  useEffect(() => {

    let idleClipAction = mixer.clipAction(idleClips[0]);
    idleClipAction.play();
    let blinkClip = createAnimation(blinkData, morphTargetDictionaryBody, 'HG_Body');
    let blinkAction = mixer.clipAction(blinkClip);
    blinkAction.play();


  }, []);

  // Play animation clips when available
  useEffect(() => {

    if (playing === false)
      return;
    
    _.each(clips, clip => {
        console.log(clip)
        let clipAction = mixer.clipAction(clip);
        clipAction.setLoop(THREE.LoopOnce);
        clipAction.play();

    });

  }, [playing]);

  
  useFrame((state, delta) => {
    mixer.update(delta);
  });


  return (
    <group name="avatar">
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}


function makeSpeech(text) {
  return axios.post(host + '/talk', { text, action: 'question' });
}
  

// const STYLES = {
//   listener: {
//     position: 'absolute',
//     bottom: '150px',
//     border: '16px solid #f3f3f3',
//     borderRadius: '50%',
//     borderTop: '16px solid #3498db',
//     width: '120px',
//     height: '120px',
//     visibility: 'hidden'
//   },
//   loader: {
//     position: 'absolute',
//     bottom: '150px',
//     border: '16px solid #f3f3f3',
//     borderRadius: '50%',
//     borderTop: '16px solid #3498db',
//     width: '120px',
//     height: '120px',
//     animation: 'spin 2s linear infinite'
//   },
//   area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
//   text: {margin: '0px', width:'300px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.2em', border: 'none'},
//   speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None'},
//   area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500},
//   label: {color: '#777777', fontSize:'0.8em'}
// }

function App() {

  const audioPlayer = useRef();

  const [speak, setSpeak] = useState(false);
  const [text, setText] = useState("");
  const [audioSource, setAudioSource] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [styles, setStyles] = useState({
    listener: {
      position: 'absolute',
      // bottom: '150px',
      left: '10%', 
      top: '50%',
      border: '16px solid #f3f3f3',
      borderRadius: '50%',
      borderTop: '16px solid #3498db',
      width: '120px',
      height: '120px',
      visibility: 'hidden'
    },
    loader: {
      display: 'none',
      position: 'absolute',
      left: '10%', 
      top: '50%',
      border: '16px solid #f3f3f3',
      borderRadius: '50%',
      borderTop: '16px solid #3498db',
      width: '120px',
      height: '120px',
      animation: 'spin 2s linear infinite',
    },
    area: {position: 'absolute', bottom:'10px', left: '10px', zIndex: 500},
    text: {margin: '0px', width:'600px', padding: '5px', background: 'none', color: '#ffffff', fontSize: '1.8em', border: 'none'},
    speak: {padding: '10px', marginTop: '5px', display: 'block', color: '#FFFFFF', background: '#222222', border: 'None', fontSize: '20px'},
    area2: {position: 'absolute', top:'5px', right: '15px', zIndex: 500, fontSize: '1.8em'},
    label: {color: '#777777', fontSize:'0.8em'}
  })

  // const Loader = () => <div>Loading...</div>;

  // End of play
  function playerEnded(e) {
    setAudioSource(null);
    setSpeak(false);
    setPlaying(false);
  }

  // Player is read
  function playerReady(e) {
    audioPlayer.current.audioEl.current.play();
    setPlaying(true);

  }  

  return (
    <div className="full">
      <style>
        {`
          @-webkit-keyframes spin {
            0% { -webkit-transform: rotate(0deg); }
            100% { -webkit-transform: rotate(360deg); }
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          #speech.btn {
            border: none;
            padding: 0;
            border-radius: 100%;
            width: 150px;
            height: 150px;
            font-size: 1.5em;
            color: #fff;
            padding: 0;
            margin: 0;
            background: #FF3D7F;
            position: relative;
            display: inline-block;
              line-height: 50px;
              text-align: center;
              white-space: nowrap;
              vertical-align: middle;
              -ms-touch-action: manipulation;
              touch-action: manipulation;
              cursor: pointer;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
              background-image: none;
          }
          
          .pulse-ring {
            content: '';
            width: 150px;
            height: 150px;
            border: 5px solid #FF3D7F;
            border-radius: 50%;
            position: absolute;
            top: -5px;
            left: -5px;
            animation: pulsate infinite 2s;
          }
          
          @-webkit-keyframes pulsate {
            0% {
              -webkit-transform: scale(1, 1);
              opacity: 1;
            }
            100% {
              -webkit-transform: scale(1.2, 1.2);
              opacity: 0;
            }
          }
          
        `}
      </style>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
      </head>
      <div style={styles.area}>
        <textarea rows={4} type="text" style={styles.text} value={text} onChange={(e) => setText(e.target.value.substring(0, 200))} />
        <button onClick={() => setSpeak(true)} style={styles.speak}> { speak? 'Running...': 'Speak' }</button>

      </div>
      <ReactAudioPlayer
        src={audioSource}
        ref={audioPlayer}
        onEnded={playerEnded}
        onCanPlayThrough={playerReady}
        
      />

      <div style={{ ...styles.area2, width: '600px' }}>
        <Table tableData={tableData} />
      </div>

      {/* <Stats /> */}
    <Canvas dpr={2} onCreated={(ctx) => {
        ctx.gl.physicallyCorrectLights = true;
      }}>

      <OrthographicCamera 
      makeDefault
      zoom={2000}
      position={[0, 1.65, 1]}
      />

      {/* <OrbitControls
        target={[0, 1.65, 0]}
      /> */}

      <Suspense fallback={null}>
        <Environment background={false} files="/images/photo_studio_loft_hall_1k.hdr" />
      </Suspense>

      <Suspense fallback={null}>
        <Bg />
      </Suspense>

      <Suspense fallback={null}>



          <Avatar 
            avatar_url="/model.glb" 
            speak={speak} 
            setSpeak={setSpeak}
            text={text}
            setText={setText}
            setAudioSource={setAudioSource}
            setTableData={setTableData}
            playing={playing}
            styles={styles}
            setStyles={setStyles}
            />

      
      </Suspense>

  

  </Canvas>
  {/* <Loader dataInterpolation={(p) => `Loading... please wait`}  /> */}
  <div style={styles.loader}></div>
  <div style={styles.listener}>
    <button id="speech" class="btn">
      <i class="fa fa-microphone" aria-hidden="true"></i>
      <div class="pulse-ring"></div>
    </button>
  </div>
  
  </div>
  )
}

function Bg() {
  
  const texture = useTexture('/images/bg.webp');

  return(
    <mesh position={[0, 1.5, -2]} scale={[0.8, 0.8, 0.8]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} />

    </mesh>
  )

}

export default App;
