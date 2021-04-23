import * as base64 from './base64'

// 测试用例来自以下地址
// https://github.com/LinusU/encode-utf8/blob/bd6c09b1c67baafc51853b1bea0e80bfe1e69ed0/test.js
const testCases = [
  ['正', '5q2j'],
  ['𝌆', '8J2Mhg'],
  ['💩', '8J-SqQ'],
  ['Hello, World!', 'SGVsbG8sIFdvcmxkIQ'],
  ['🐵 🙈 🙉 🙊', '8J-QtSDwn5mIIPCfmYkg8J-Zig'],
  ['åß∂ƒ©˙∆˚¬…æ', 'w6XDn-KIgsaSwqnLmeKIhsuawqzigKbDpg'],
  ['사회과학원 어학연구소', '7IKs7ZqM6rO87ZWZ7JuQIOyWtO2VmeyXsOq1rOyGjA'],
  ['ﾟ･✿ヾ╲(｡◕‿◕｡)╱✿･ﾟ', '776f772l4py_44O-4pWyKO-9oeKXleKAv-KXle-9oSnilbHinL_vvaXvvp8'],
  ['Powerلُلُصّبُلُلصّبُررً ॣ ॣh ॣ ॣ冗', 'UG93ZXLZhNmP2YTZj9i12ZHYqNmP2YTZj9mE2LXZkdio2Y_Ysdix2Ysg4KWjIOClo2gg4KWjIOClo-WGlw'],
  ['𝕿𝖍𝖊 𝖖𝖚𝖎𝖈𝖐 𝖇𝖗𝖔𝖜𝖓 𝖋𝖔𝖝 𝖏𝖚𝖒𝖕𝖘 𝖔𝖛𝖊𝖗 𝖙𝖍𝖊 𝖑𝖆𝖟𝖞 𝖉𝖔𝖌', '8J2Vv_Cdlo3wnZaKIPCdlpbwnZaa8J2WjvCdlojwnZaQIPCdlofwnZaX8J2WlPCdlpzwnZaTIPCdlovwnZaU8J2WnSDwnZaP8J2WmvCdlpLwnZaV8J2WmCDwnZaU8J2Wm_CdlorwnZaXIPCdlpnwnZaN8J2WiiDwnZaR8J2WhvCdlp_wnZaeIPCdlonwnZaU8J2WjA']
]

describe('test base64', () => {
  test('urlSafeBase64Encode', () => {
    for (const [input, expected] of testCases) {
      const actual = base64.urlSafeBase64Encode(input)
      expect(actual).toMatch(expected)
    }
  })
  test('urlSafeBase64Decode', () => {
    for (const [expected, input] of testCases) {
      const actual = base64.urlSafeBase64Decode(input)
      expect(actual).toMatch(expected)
    }
  })
})
