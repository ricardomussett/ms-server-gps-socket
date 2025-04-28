import { IsArray } from 'class-validator'

export class FilterDto {
  @IsArray()
  pseudoIPs: string[]
}
