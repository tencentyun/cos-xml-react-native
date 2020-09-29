import {
  NativeModules,
  NativeEventEmitter
 } from 'react-native';

const { CosXmlReactNative } = NativeModules;

type CosXmlReactNativeType = {
  initWithPlainSecret(configurations: object, credential: Secret): void;
  initWithSessionCredentialCallback(configurations: object): void;
  putObject(request: UploadObjectRequest): Promise<UploadObjectResult>;
  getObject(request: DownloadObjectRequest): Promise<string>;
  updateSessionCredential(credential: SessionCredential):void;
  pauseUpload(requestId: string):Promise<string>;
}
let cosModule = CosXmlReactNative as CosXmlReactNativeType

export type progressListener = (processedBytes: number, targetBytes: number) => void

export type ProgressEvent = {
  requestId: string;
  processedBytes: number;
  targetBytes: number;
}

export type UploadObjectRequest = {
  requestId?: string;
  bucket: string;
  object: string;
  fileUri: string;
}
export type UploadObjectResult = {
  Bucket:string;
  Key:string;
  Location:string;
  ETag:string;
  VersionID:string|null;
}

export type DownloadObjectRequest = {
  requestId?: string;
  bucket: string;
  object: string;
  filePath?: string;
}

export type Secret = {
  secretId: string;
  secretKey: string;
}

export type SessionCredential = {
  tmpSecretId: string;
  tmpSecretKey: string;
  expiredTime: number;
  sessionToken: string;
}

class COSTransferManagerService {

  private callbacks: Map<string, progressListener>;
  private requests: Map<string, UploadObjectRequest>;
  private emitter: NativeEventEmitter;
  private initialized: boolean = false;

  constructor() {
    this.callbacks = new Map()
    this.requests = new Map()

    this.emitter = new NativeEventEmitter(CosXmlReactNative);

    this.emitter.addListener("COSTransferProgressUpdate", (event: ProgressEvent) => {
      let requestId = event.requestId;
      if (this.callbacks.has(requestId)) {
        this.callbacks.get(requestId)!(event.processedBytes, event.targetBytes);
      }
    });
  }

  initWithPlainSecret(configurations: object, credential: Secret): void {
    if (!this.initialized) {
      this.initialized = true
      cosModule.initWithPlainSecret(configurations, credential)
    } else {
      console.log('COS Service has been inited before.')
    }
  }

  initWithSessionCredentialCallback(configurations: object, callback: () => Promise<SessionCredential>): void {
    if (!this.initialized) {
      this.initialized = true
      cosModule.initWithSessionCredentialCallback(configurations)
      this.emitter.addListener("COSUpdateSessionCredential", async () => {
        const credential = await callback()
        if (credential.expiredTime && typeof credential.expiredTime !== 'number') {
          credential.expiredTime = parseInt(credential.expiredTime)
        }
        cosModule.updateSessionCredential(credential)
      });
    } else {
      console.log('COS Service has been inited before.')
    }
  }

  async upload(request: UploadObjectRequest, progressListener?: progressListener): Promise<UploadObjectResult> {
    let uniqueId = request.requestId
    if (!uniqueId) {
      uniqueId = this.uniqueRequestId()
      request.requestId = uniqueId
    }
    if (progressListener) {
      this.callbacks.set(uniqueId, progressListener)
    }
    this.requests.set(uniqueId, request)

    try {
      const info = await cosModule.putObject(request);
      return info;
    } catch(err) {
      throw err
    } finally {
      this.removeRequestIdRecord(uniqueId);
    }
  }

  async pause(request: UploadObjectRequest) {
    let uniqueId:string | null = null
    this.requests.forEach((value, key) => {
      if (value == request) {
        uniqueId = key
      }
    })
    if (uniqueId) {
      try {
        await cosModule.pauseUpload(uniqueId)
        this.removeRequestIdRecord(uniqueId);
      } catch (error) {
        console.log(error)
      }
    } else {
      console.log('Request not found')
    }
  }

  async download(request: DownloadObjectRequest, progressListener?: progressListener): Promise<string> {
    let uniqueId:string = this.uniqueRequestId()
    request.requestId = uniqueId
    if (progressListener) {
      this.callbacks.set(uniqueId, progressListener)
    }
    try {
      const filePath = await cosModule.getObject(request);
      return filePath;
    } catch(err) {
      throw err
    } finally {
      this.removeRequestIdRecord(uniqueId);
    }
  }

  private removeRequestIdRecord(uniqueId: string | null) {
    if (uniqueId) {
      this.callbacks.delete(uniqueId)
      this.requests.delete(uniqueId)
    }
  }

  private uniqueRequestId(): string {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
};

export default new COSTransferManagerService()
