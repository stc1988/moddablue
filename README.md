# Moddable Media Player

Moddable Piu で作る小型ディスプレイ向けのメディアプレイヤー GUI です。現在は simulator で動く mock service を初期状態にしており、再生中の曲情報、アルバムアート、再生位置、音量、接続先デバイスを 240x320 の画面に表示します。

## Features

- 曲名、アーティスト名、アルバムアートを表示
- 再生、一時停止、前後トラック送りのタッチ操作
- 再生位置スライダーの表示とタッチ操作
- 音量スライダーの表示とタッチ操作
- 接続先デバイス名と接続状態の表示
- iTunes Search API を使ったアルバムアート取得

## Current Status

デフォルトでは simulator-safe な mock service が使われます。実機向け Apple Media Service 連携は `esp32/*` platform 用のサービスとして分離されていますが、通常の simulator 起動では BLE/AMS には接続しません。

アルバムアートはネットワーク経由で取得します。

## Run

ビルド確認だけを行う場合は、リポジトリルートから次を実行します。

```sh
cd src && mcconfig -d -m -p sim -t build
```

xsdb でデバッグ起動する場合はこちらです。

```sh
npm run debug:sim
```

`(xsdb)` プロンプトでは `help` で利用可能なデバッガコマンドを確認できます。

## Check

```sh
npm run check
```

整形も含めて自動修正する場合:

```sh
npm run check:write
```

## Notes

この README はアプリ利用者向けの概要です。実装方針、責務分担、シーケンス、参照すべき Moddable SDK 実装は [AGENTS.md](AGENTS.md) にまとめています。
