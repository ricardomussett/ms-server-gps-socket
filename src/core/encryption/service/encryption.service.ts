import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv } from 'crypto'

@Injectable()
export class EncryptService {
  private password: string
  private iv: string

  constructor(private readonly configService: ConfigService) {
    this.password = this.configService.get<string>('ENCRYPT_PASSWORD') as string
    this.iv = this.configService.get<string>('ENCRYPT_IV') as string
  }

  public encrypt(text: string) {
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(this.password, 'hex'), Buffer.from(this.iv, 'hex'))

    let encrypted = cipher.update(String(text))

    encrypted = Buffer.concat([encrypted, cipher.final()])

    return encrypted.toString('hex')
  }

  public decrypt(encryptData: string) {
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(this.password, 'hex'), Buffer.from(this.iv, 'hex'))

    let decryptedData = decipher.update(encryptData, 'hex', 'utf8')
    decryptedData += decipher.final('utf8')

    return decryptedData
  }
}
