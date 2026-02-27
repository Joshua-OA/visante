Skip to content
expo
expo
Repository navigation
Code
Issues
327
 (327)
Pull requests
468
 (468)
Discussions
Actions
Wiki
Security
Insights
How can I record audio in Expo as a WAV file? #24034
Unanswered
aramis-it asked this question in Archived: Questions

aramis-it
on Aug 21, 2023
I did not find any solution.

Replies:8 comments · 21 replies

sabuhiteymurov
on Sep 1, 2023
Expo Audio docs indicates that you can specify the supported file extensions for each platform (refer to the Android and iOS documentation). When using Recording.createAsync, set AndroidOutputFormat and AndroidAudioEncoder to DEFAULT, file extension to .wav and IOSOutputFormat to LINEARPCM in options. Here is the minimal example:
Gist

8 replies
@ClaytonRoberts
ClaytonRoberts
on Jul 31, 2024
I did not found direct solution. I used converter.

Thanks for the following up so far. Could you share what converter you went with?
Is it a client-side converter?

@aramis-it
aramis-it
on Aug 1, 2024
Author
I don't remember exactly. I think I did it in server side.

@yybawang
yybawang
on Aug 29, 2024
Android doesn't have wav/pcm options，So if you are doing work for live speech-to-text，try AAC format，This format works well for STT(of course you should check the remote server api)，It's works for me, hope help somebody

Example configuration:

const RecordingOptions = {
isMeteringEnabled: true,
android: {
extension: '.aac',
outputFormat: AndroidOutputFormat.AAC_ADTS,
audioEncoder: AndroidAudioEncoder.AAC,
sampleRate: 16000,
numberOfChannels: 1,
bitRate: 16000,
},
ios: {
extension: '.wav',
outputFormat: IOSOutputFormat.LINEARPCM,
audioQuality: IOSAudioQuality.MEDIUM,
sampleRate: 16000,
numberOfChannels: 1,
bitRate: 16000,
// linearPCMBitDepth: 16,
// linearPCMIsBigEndian: false,
// linearPCMIsFloat: false,
},
web: {
mimeType: 'audio/webm',
bitsPerSecond: 128000,
},
};

@suvam3000
suvam3000
on Sep 20, 2024
@yybawang I am working with azure/ microsoft cognitive speech service STT. I tried different way of the config, that you have provided but it's not working. Most likely outputFormat has to be wav for andriod.

@Sabaa-Abdennabi
Sabaa-Abdennabi
on Sep 21, 2024
still no solution till now ? i am facing the same problem .


alextaikh
on Oct 30, 2024
Anyone knows an updated solution? Facing the same problem of needing wav for Azure STT

0 replies

admfrenchdev
on Nov 13, 2024
Been two days that I try doing this with whatever lib exists besides expo-av and still no result. Tbh really disappointed by myself ^^ 😢
Any help with this will be really appreciated.

0 replies

alextaikh
on Nov 19, 2024
So the only solution is to use aac and then pass that to Backend, and Backend convert acc to wave and send to Azure?

0 replies

admfrenchdev
on Nov 19, 2024
Found @siteed/expo-audio-stream that allows to record a WAV file.
This is working with Azure speechToText:

import {
  AudioRecording,
  RecordingConfig,
  useAudioRecorder,
} from "@siteed/expo-audio-stream";
import {
  AudioConfig,
  SpeechTranslationConfig,
  TranslationRecognizer,
  SpeechConfig,
} from "microsoft-cognitiveservices-speech-sdk";
// [...component code]
  const { startRecording, stopRecording, isRecording } = useAudioRecorder({
    debug: true,
  });

  const onRecordStart = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (granted) {
        const config: RecordingConfig = {
          sampleRate: 16000,
          channels: 1,
          encoding: "pcm_16bit",
          onAudioStream: async (e) => {
            // This callback seems mandatory, even if you only want to record the file at the end
            console.log("data received");
          },
        };
        const result = await startRecording(config);
        console.log("Recording started with config:", result);
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const onRecordStop = async () => {
      const audioRecord = await stopRecording();

      // Ugly filepath trick, might be improved
      const blob = await fetch(uri.replace("file:/", "file:///")).then((res) =>
        res.blob()
      );
      const file = new File([blob], "record.wav");
      const audioConfig = AudioConfig.fromWavFileInput(file);

      const speechApiConfig = SpeechTranslationConfig.fromSubscription(
        // Be aware this subcription key shoudl never be public. Hardcoded here for POC purpose.
        // Use the authByToken way instead
        subKey,
        "eastus2"
      );

      speechApiConfig.speechRecognitionLanguage = "en-US";
      speechApiConfig.addTargetLanguage("fr-FR");
      speechApiConfig.addTargetLanguage("de-DE");

      const transRecognizer = new TranslationRecognizer(
        speechApiConfig,
        audioConfig
      );

      transRecognizer.recognized = (reco, e) => {
        console.log("Recognized text: ", e.result.text);
      };

      transRecognizer.recognizeOnceAsync(
        (result) => {
          console.log({
            originalText: result.text,
            translations: result.translations,
          });
        },
        (e) => {
          console.log("ERROR", e);
        }
      );

  }
// [...component code]
Thing that bothers me right now is that I can't make this work with continuous recognition forcing me to wait the end of recording to get translations.
Been trying to use the onAudioStream cb to send data during recording, but I might still be missing something as I get no response from Azure. Still in progress.

11 replies
@Sabaa-Abdennabi
Sabaa-Abdennabi
on Jan 20, 2025
can you please specify which version of audio stream and expo you're using because i am using expo 51.0.23 and audio stream 1.7.0 and i am facing this problem Error: Cannot find native module 'ExpoAudioStream', js engine: hermes (tried deleting nodes , building ,clearing cache still doesn't work ) . I'd appreciate any kind of help !

@ClaytonRoberts
ClaytonRoberts
on Jan 20, 2025
@Sabaa-Abdennabi, "expo": "~51.0.18", "@siteed/expo-audio-stream": "^1.6.1",

But i think the issue you're facing is related to how you're building.
The docs mention using prebuild (https://deeeed.github.io/expo-audio-stream/docs/installation/). And i figured out after facing the same issue you are that when you're using react native rather than expo modules, you need to build in a different way.
This expo-audio-stream library - i assume - is using RN libraries that necessitate a different build approach than what expo and hermes etc do. So the way around the issue is to prebuild, pod install, and expo run:ios. It's a fuller build than what expo start does.
I have Simulator set up to run ipad/iphone emulation. and run:ios leverages that.

@ClaytonRoberts
ClaytonRoberts
on Jan 20, 2025
here's an appstore note that will save you some hours:
I think the expo-audio-stream affects the pod install and adds UIBackgroundModes permissions to the Info.plist under the ios/[appName] folder. the app store reviewer i had noticed that my app was asking for audio permissions in background, but that the app didn't use them. and that was a holdup on approval. ...To fix it, after the prebuild but before the export of the app to the app store, i manually removed the audio item from the plist file. ...I think i'll have to do this each time, bc my efforts to do it programmatically failed; Programatic might be possible, but i couldn't pull it off.

@Sabaa-Abdennabi
Sabaa-Abdennabi
on Jan 20, 2025
Thank you so much @ClaytonRoberts this helped a lot . I was using expo go which caused that error to appear . Once i built the app using npx expo prebuild and npx expo run:android it worked just fine . THANKSS !

@Chryogenic
Chryogenic
on Jul 1, 2025
Found @siteed/expo-audio-stream that allows to record a WAV file. This is working with Azure speechToText:

import {
  AudioRecording,
  RecordingConfig,
  useAudioRecorder,
} from "@siteed/expo-audio-stream";
import {
  AudioConfig,
  SpeechTranslationConfig,
  TranslationRecognizer,
  SpeechConfig,
} from "microsoft-cognitiveservices-speech-sdk";
// [...component code]
  const { startRecording, stopRecording, isRecording } = useAudioRecorder({
    debug: true,
  });

  const onRecordStart = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (granted) {
        const config: RecordingConfig = {
          sampleRate: 16000,
          channels: 1,
          encoding: "pcm_16bit",
          onAudioStream: async (e) => {
            // This callback seems mandatory, even if you only want to record the file at the end
            console.log("data received");
          },
        };
        const result = await startRecording(config);
        console.log("Recording started with config:", result);
      }
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const onRecordStop = async () => {
      const audioRecord = await stopRecording();

      // Ugly filepath trick, might be improved
      const blob = await fetch(uri.replace("file:/", "file:///")).then((res) =>
        res.blob()
      );
      const file = new File([blob], "record.wav");
      const audioConfig = AudioConfig.fromWavFileInput(file);

      const speechApiConfig = SpeechTranslationConfig.fromSubscription(
        // Be aware this subcription key shoudl never be public. Hardcoded here for POC purpose.
        // Use the authByToken way instead
        subKey,
        "eastus2"
      );

      speechApiConfig.speechRecognitionLanguage = "en-US";
      speechApiConfig.addTargetLanguage("fr-FR");
      speechApiConfig.addTargetLanguage("de-DE");

      const transRecognizer = new TranslationRecognizer(
        speechApiConfig,
        audioConfig
      );

      transRecognizer.recognized = (reco, e) => {
        console.log("Recognized text: ", e.result.text);
      };

      transRecognizer.recognizeOnceAsync(
        (result) => {
          console.log({
            originalText: result.text,
            translations: result.translations,
          });
        },
        (e) => {
          console.log("ERROR", e);
        }
      );

  }
// [...component code]
Thing that bothers me right now is that I can't make this work with continuous recognition forcing me to wait the end of recording to get translations. Been trying to use the onAudioStream cb to send data during recording, but I might still be missing something as I get no response from Azure. Still in progress.

Any luck on getting it to work with continuous recognition?


Sabaa-Abdennabi
on Nov 19, 2024
I personally made a format converter using python using ffmpeg to convert to .wav because i found no other alternative to record using .wav on android

2 replies
@admfrenchdev
admfrenchdev
on Nov 21, 2024
Well, if it works, it works!
But I personnaly prefer using user device to compute instead of paying a server to do the job (without speaking about latency...) ;)

@Sabaa-Abdennabi
Sabaa-Abdennabi
on Jan 20, 2025
that's true i have faced a latency issue that's why i am working on finding another alternative , thank you for the opinion !


OliverHuang-WTG
on May 11, 2025
Found another way to solve this problem
I used recorder-core to convert amrnb format to pcm format (wav can also be converted)

This is the config of useAudioRecorder :

{
  extension: ".caf",
  numberOfChannels: 1,
  sampleRate: 16000,
  android: {
    extension: ".amr",
    outputFormat: "amrnb",
    audioEncoder: "amr_nb",
  },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};
Then I need to translate amrnb to pcm:

import * as FileSystem from "expo-file-system";
import "recorder-core";
import "recorder-core/src/engine/beta-amr";
import "recorder-core/src/engine/beta-amr-engine";
import "recorder-core/src/engine/pcm";
import Recorder from "recorder-core";
import { Platform } from "react-native";

function int16ArrayToBase64(array: Int16Array): string {
  const bytes = new Uint8Array(array.buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sampleRaise(
  pcmDatas: Int16Array[],
  pcmSampleRate: number,
  newSampleRate: number
): Int16Array {
  let size = 0;
  for (let i = 0; i < pcmDatas.length; i++) {
    size += pcmDatas[i].length;
  }

  let step = newSampleRate / pcmSampleRate;
  if (step <= 1) {
    step = 1;
    newSampleRate = pcmSampleRate;
  } else {
    size = Math.floor(size * step);
  }

  let filterFn: any = 0;
  if (pcmSampleRate <= (newSampleRate * 3) / 4) {
    filterFn = Recorder.IIRFilter(
      true,
      newSampleRate,
      ((pcmSampleRate / 2) * 3) / 4
    );
  }

  const res = new Int16Array(size);

  let posFloat = 0,
    prev = 0;
  let F = filterFn && filterFn.Embed,
    Fx = 0,
    Fy = 0;
  for (let index = 0, nl = pcmDatas.length; index < nl; index++) {
    let arr = pcmDatas[index];
    for (let i = 0; i < arr.length; i++) {
      const cur = arr[i];

      let pos = Math.floor(posFloat);
      posFloat += step;
      const end = Math.floor(posFloat);

      const n = (cur - prev) / (end - pos);
      for (let j = 1; pos < end; pos++, j++) {
        //res[pos]=cur;
        let s = Math.floor(prev + j * n);
        if (F) {
          Fx = s;
          Fy =
            F.b0 * Fx + F.b1 * F.x1 + F.b0 * F.x2 - F.a1 * F.y1 - F.a2 * F.y2;
          F.x2 = F.x1;
          F.x1 = Fx;
          F.y2 = F.y1;
          F.y1 = Fy;
          s = Fy;
        } else {
          s = filterFn ? filterFn(s) : s;
        }

        if (s > 0x7fff) s = 0x7fff;
        else if (s < -0x8000) s = -0x8000;
        res[pos] = s;
      }

      prev = cur;
    }
  }

  return res;
}

function amr2pcm(base64File: string): Promise<string> {
  const bstr = atob(base64File);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Promise(async (resolve, reject) => {
    Recorder.AMR.decode(
      u8arr,
      function (pcm: ArrayBuffer) {
        const rec = Recorder({
          type: "pcm",
          sampleRate: 8000,
          bitRate: 16,
        });
        rec.dataType = "arraybuffer";
        rec.mock(pcm, 8000).stop(async function (wavBlob: ArrayBuffer) {
          resolve(
            int16ArrayToBase64(
              sampleRaise([new Int16Array(wavBlob)], 8000, 16000)
            )
          );
        }, reject);
      },
      reject
    );
  });
}

export async function test(uri: string) { // this is a test method to call amr2pcm
  const file = await FileSystem.readAsStringAsync(`file://${uri}`, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (Platform.OS === "android") {
    const pcm = await amr2pcm(file);
    return pcm;
  }

  return file;
}

If you want to convert to wav, you can import recorder-core/src/engine/wav.
then set the type to wav when new Recorder.

Of course, you can also convert pcm to wav directly, because wav only has one more header than pcm.

0 replies

ishmamx
on Jun 28, 2025
Was anyone able to make it work with Google or Microsoft real time transcription (voice to text)? (currently my app does the transcription when recording stops, but I want real time) :(

0 replies

Suggest an answer
Comment
 
Add your answer here...
Remember, contributions to this repository should follow its contributing guidelines and security policy.
Category
✋
Archived: Questions
Labels
None yet
14 participants
@aramis-it
@Nesquik
@ishmamx
@yybawang
@Chryogenic
@ClaytonRoberts
@alextaikh
@OliverHuang-WTG
@sabuhiteymurov
@davidgaag
@a-rostami
@suvam3000
@Sabaa-Abdennabi
@admfrenchdev
Notifications
You’re not receiving notifications from this thread.
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Community
Docs
Contact
Manage cookies
Do not share my personal information
