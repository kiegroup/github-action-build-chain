export interface Serializable<SerializedType, DeserializedType> {
  toJSON(): SerializedType
  fromJSON(json: SerializedType): DeserializedType
}