## COS XML React Native SDK

### 安装 SDK

```
npm install cos-xml-react-native
```

如果你使用 `yarn`，

```
yarn add cos-xml-react-native
```

如果没有自动执行 `pod` 安装，请执行：

```
cd ios
pod install
```

### 开始使用

#### 1. 导入 SDK

```
import CosXmlReactNative from 'cos-xml-react-native';
```

#### 2. 初始化服务

**使用临时密钥初始化**

```ts
// 使用临时密钥初始化
CosXmlReactNative.initWithSessionCredentialCallback({
  region: region
}, async () => {
  // 请求临时密钥
  const response = await fetch(STS_URL);
  const responseJson = await response.json();
  const credentials = responseJson.credentials;
  const expiredTime = responseJson.expiredTime;
  const sessionCredentials = {
    tmpSecretId: credentials.tmpSecretId,
    tmpSecretKey: credentials.tmpSecretKey,
    expiredTime: expiredTime,
    sessionToken: credentials.sessionToken
  };
  console.log(sessionCredentials);
  return sessionCredentials;
})
```

**使用永久密钥进行本地调试**

```ts
const SECRET_ID: string = 'Your Secret ID'  // 腾讯云永久密钥 SecretID
const SECRET_KEY: string = 'Your Secret Key'  // 腾讯云永久密钥 SecretKey
// 使用永久密钥进行本地调试
CosXmlReactNative.initWithPlainSecret({
  region: region
}, {
  secretId: SECRET_ID,
  secretKey: SECRET_KEY
})
```

### 访问 COS 服务

#### 上传文件

```ts
const uploadRequest = {
  bucket: bucket,
  object: objectKey,
  // 文件本地 Uri 或者 路径
  fileUri: 'file://xxx'
}

// 上传 与 暂停后续传对象
// 注意如果是续传，请务必跟初始上传使用同一个 uploadRequest 对象 
CosXmlReactNative.upload(uploadRequest, 
  (processedBytes: number, targetBytes: number) => {
    // 回调进度
    console.log('put Progress callback : ', processedBytes, targetBytes)
    setProgress(processedBytes / targetBytes)
}).then((info) => {
  // info 包含上传结果
  console.log(info)
}).catch((e) => {
  console.log(e)
})
```

暂停上传请调用：

```ts
CosXmlReactNative.pause(uploadRequest)
```

#### 下载文件

```ts
// 下载对象
CosXmlReactNative.download({
  bucket: bucket,
  object: objectKey
}, (processedBytes: number, targetBytes: number) => {
  // 回调进度
  console.log('get Progress callback : ', processedBytes, targetBytes)
  setProgress(processedBytes / targetBytes)
}).then((filePath) => {
  // filePath 是保存到本地的路径
  setSource({uri: "file://" + filePath})
}).catch((e) => {
  console.log(e)
})
```

### 示例

完整的例子请参考 example 示例工程。
