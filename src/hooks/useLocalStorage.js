import { useEffect, useState } from 'react'
import { load, save } from '../lib/storage'

/**
 * 与 localStorage 双向同步的 state：
 * 初始值从 localStorage 惰性读取，之后每次变化自动写回。
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => load(key, initialValue))

  useEffect(() => {
    save(key, value)
  }, [key, value])

  return [value, setValue]
}
