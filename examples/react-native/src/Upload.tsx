import {
  createDirectUploadTask,
  createMultipartUploadTask,
} from '@qiniu/react-native-upload';
import React from 'react';
import {Button, TextInput, View} from 'react-native';

export function Upload() {
  const [token, setToken] = React.useState('');

  const multipartUploadFile = () => {
    const file = new File(['1'.repeat(10 * 1024 * 1024)], 'test.file');

    const task = createMultipartUploadTask(
      {type: 'file', data: file},
      {
        logLevel: 'INFO',
        tokenProvider: async () => token,
      },
    );

    task.start();
  };

  const directUploadFile = () => {
    const file = new File(['1'.repeat(10 * 1024 * 1024)], 'test.file');

    const task = createDirectUploadTask(
      {type: 'file', data: file},
      {
        logLevel: 'INFO',
        tokenProvider: async () => token,
      },
    );

    task.onComplete(console.log);
    task.onProgress(console.log);
    task.onError(console.log);

    task.start();
  };

  return (
    <View>
      <TextInput
        placeholder="请输入 token"
        value={token}
        onChangeText={setToken}
      />
      <Button onPress={multipartUploadFile} title="分片上传" />
      <Button onPress={directUploadFile} title="表单直传" />
    </View>
  );
}
