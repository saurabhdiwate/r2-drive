import { describe, it, expect } from 'vitest'
import {
  cn,
  formatBytes,
  formatSpeed,
  formatDate,
  formatDateRelative,
  getExtension,
  classifyFile,
  isTextFile,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isPdfFile,
  isMarkdownFile,
  prismLanguage,
  isFolderKey,
  basename,
  parentKey,
  joinKey,
  assertSafeName,
  assertSafeKey,
  escapeHtml,
  applySort,
  matchesCategoryFilter,
  formatErrorMessage
} from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })
})

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB')
  })

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.0 GB')
  })

  it('handles negative input', () => {
    expect(formatBytes(-1)).toBe('0 B')
  })

  it('handles NaN', () => {
    expect(formatBytes(NaN)).toBe('0 B')
  })

  it('handles Infinity', () => {
    expect(formatBytes(Infinity)).toBe('0 B')
  })

  it('formats with custom decimals', () => {
    expect(formatBytes(1536, 2)).toBe('1.50 KB')
  })
})

describe('formatSpeed', () => {
  it('formats zero speed', () => {
    expect(formatSpeed(0)).toBe('0 B/s')
  })

  it('formats negative speed', () => {
    expect(formatSpeed(-1)).toBe('0 B/s')
  })

  it('formats KB/s', () => {
    expect(formatSpeed(1024)).toBe('1.0 KB/s')
  })
})

describe('formatDate', () => {
  it('formats valid ISO date', () => {
    const result = formatDate('2024-01-15T12:00:00Z')
    expect(result).not.toBe('—')
  })

  it('returns dash for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatDateRelative', () => {
  it('returns Just now for recent dates', () => {
    const now = new Date().toISOString()
    expect(formatDateRelative(now)).toBe('Just now')
  })

  it('returns dash for invalid date', () => {
    expect(formatDateRelative('invalid')).toBe('—')
  })
})

describe('getExtension', () => {
  it('extracts extension', () => {
    expect(getExtension('file.txt')).toBe('txt')
  })

  it('returns empty for no extension', () => {
    expect(getExtension('noextension')).toBe('')
  })

  it('returns empty for trailing dot', () => {
    expect(getExtension('file.')).toBe('')
  })

  it('handles uppercase extensions', () => {
    expect(getExtension('file.TXT')).toBe('txt')
  })
})

describe('classifyFile', () => {
  it('classifies images', () => {
    expect(classifyFile('photo.jpg')).toBe('image')
    expect(classifyFile('icon.png')).toBe('image')
    expect(classifyFile('banner.webp')).toBe('image')
  })

  it('classifies videos', () => {
    expect(classifyFile('video.mp4')).toBe('video')
    expect(classifyFile('clip.webm')).toBe('video')
  })

  it('classifies audio', () => {
    expect(classifyFile('song.mp3')).toBe('audio')
    expect(classifyFile('podcast.wav')).toBe('audio')
  })

  it('classifies documents', () => {
    expect(classifyFile('report.pdf')).toBe('document')
    expect(classifyFile('data.xlsx')).toBe('document')
  })

  it('classifies text files', () => {
    expect(classifyFile('notes.txt')).toBe('text')
  })

  it('classifies code files', () => {
    expect(classifyFile('index.ts')).toBe('code')
    expect(classifyFile('app.py')).toBe('code')
    expect(classifyFile('style.css')).toBe('code')
  })

  it('classifies archives', () => {
    expect(classifyFile('backup.zip')).toBe('archive')
    expect(classifyFile('data.tar.gz')).toBe('archive')
  })

  it('returns other for unknown', () => {
    expect(classifyFile('file.xyz')).toBe('other')
  })
})

describe('isTextFile', () => {
  it('identifies text files', () => {
    expect(isTextFile('readme.md')).toBe(true)
    expect(isTextFile('code.ts')).toBe(true)
    expect(isTextFile('data.json')).toBe(true)
    expect(isTextFile('image.jpg')).toBe(false)
  })
})

describe('isImageFile', () => {
  it('identifies image files', () => {
    expect(isImageFile('photo.jpg')).toBe(true)
    expect(isImageFile('icon.svg')).toBe(true)
    expect(isImageFile('document.pdf')).toBe(false)
  })
})

describe('isVideoFile', () => {
  it('identifies video files', () => {
    expect(isVideoFile('clip.mp4')).toBe(true)
    expect(isVideoFile('image.png')).toBe(false)
  })
})

describe('isAudioFile', () => {
  it('identifies audio files', () => {
    expect(isAudioFile('song.mp3')).toBe(true)
    expect(isAudioFile('image.png')).toBe(false)
  })
})

describe('isPdfFile', () => {
  it('identifies PDF files', () => {
    expect(isPdfFile('report.pdf')).toBe(true)
    expect(isPdfFile('image.png')).toBe(false)
  })
})

describe('isMarkdownFile', () => {
  it('identifies markdown files', () => {
    expect(isMarkdownFile('readme.md')).toBe(true)
    expect(isMarkdownFile('docs.markdown')).toBe(true)
    expect(isMarkdownFile('file.txt')).toBe(false)
  })
})

describe('prismLanguage', () => {
  it('maps common extensions', () => {
    expect(prismLanguage('index.ts')).toBe('typescript')
    expect(prismLanguage('app.py')).toBe('python')
    expect(prismLanguage('style.css')).toBe('css')
  })

  it('detects dockerfile by name', () => {
    expect(prismLanguage('Dockerfile')).toBe('docker')
    expect(prismLanguage('dockerfile.dev')).toBe('docker')
  })

  it('detects makefile by name', () => {
    expect(prismLanguage('Makefile')).toBe('makefile')
  })

  it('returns empty for unknown', () => {
    expect(prismLanguage('unknown.xyz')).toBe('')
  })
})

describe('isFolderKey', () => {
  it('identifies folder keys', () => {
    expect(isFolderKey('folder/')).toBe(true)
    expect(isFolderKey('file.txt')).toBe(false)
  })
})

describe('basename', () => {
  it('extracts basename from key', () => {
    expect(basename('path/to/file.txt')).toBe('file.txt')
    expect(basename('file.txt')).toBe('file.txt')
  })

  it('handles trailing slash', () => {
    expect(basename('path/to/folder/')).toBe('folder')
  })
})

describe('parentKey', () => {
  it('returns parent key', () => {
    expect(parentKey('path/to/file.txt')).toBe('path/to/')
  })

  it('returns empty for root', () => {
    expect(parentKey('file.txt')).toBe('')
  })

  it('handles trailing slash', () => {
    expect(parentKey('path/to/folder/')).toBe('path/to/')
  })
})

describe('joinKey', () => {
  it('joins prefix and name', () => {
    expect(joinKey('folder/', 'file.txt')).toBe('folder/file.txt')
  })

  it('adds slash to prefix if missing', () => {
    expect(joinKey('folder', 'file.txt')).toBe('folder/file.txt')
  })

  it('handles empty prefix', () => {
    expect(joinKey('', 'file.txt')).toBe('file.txt')
  })
})

describe('assertSafeName', () => {
  it('accepts valid names', () => {
    expect(assertSafeName('file.txt')).toBe('file.txt')
    expect(assertSafeName('my file.pdf')).toBe('my file.pdf')
    expect(assertSafeName('unicode-文件')).toBe('unicode-文件')
  })

  it('rejects empty names', () => {
    expect(() => assertSafeName('')).toThrow('Name must not be empty')
  })

  it('rejects names with slashes', () => {
    expect(() => assertSafeName('path/file')).toThrow('Name must not contain path separators')
  })

  it('rejects names with backslashes', () => {
    expect(() => assertSafeName('path\\file')).toThrow('Name must not contain path separators')
  })

  it('rejects dot and dotdot', () => {
    expect(() => assertSafeName('.')).toThrow('Invalid name')
    expect(() => assertSafeName('..')).toThrow('Invalid name')
  })

  it('rejects control characters', () => {
    expect(() => assertSafeName('file\x00name')).toThrow('Name contains invalid characters')
    expect(() => assertSafeName('file\x1fname')).toThrow('Name contains invalid characters')
  })

  it('rejects very long names', () => {
    expect(() => assertSafeName('a'.repeat(1025))).toThrow('Name is too long')
  })

  it('trims whitespace', () => {
    expect(assertSafeName('  file.txt  ')).toBe('file.txt')
  })
})

describe('assertSafeKey', () => {
  it('accepts valid keys', () => {
    expect(assertSafeKey('folder/file.txt')).toBe('folder/file.txt')
    expect(assertSafeKey('file.txt')).toBe('file.txt')
  })

  it('rejects empty keys', () => {
    expect(() => assertSafeKey('')).toThrow('Invalid object key')
  })

  it('rejects keys starting with slash', () => {
    expect(() => assertSafeKey('/file.txt')).toThrow('Invalid object key')
  })

  it('rejects traversal attempts', () => {
    expect(() => assertSafeKey('../file.txt')).toThrow('Invalid name')
    expect(() => assertSafeKey('folder/../../etc/passwd')).toThrow('Invalid name')
  })

  it('rejects keys with backslashes', () => {
    expect(() => assertSafeKey('folder\\file.txt')).toThrow('Name must not contain path separators')
  })
})

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    )
  })

  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })
})

describe('applySort', () => {
  const items = [
    { name: 'b.txt', size: 200, type: 'text', lastModified: '2024-01-02T00:00:00Z', isFolder: false },
    { name: 'a.txt', size: 100, type: 'text', lastModified: '2024-01-01T00:00:00Z', isFolder: false },
    { name: 'folder/', size: 0, type: 'other', lastModified: '', isFolder: true }
  ] as any

  it('sorts folders first', () => {
    const result = applySort(items, { field: 'name', dir: 'asc' })
    expect(result[0].isFolder).toBe(true)
  })

  it('sorts by name ascending', () => {
    const result = applySort(items, { field: 'name', dir: 'asc' })
    expect(result[1].name).toBe('a.txt')
    expect(result[2].name).toBe('b.txt')
  })

  it('sorts by size descending', () => {
    const result = applySort(items, { field: 'size', dir: 'desc' })
    expect(result[1].size).toBe(200)
    expect(result[2].size).toBe(100)
  })
})

describe('matchesCategoryFilter', () => {
  const imageItem = { type: 'image', isFolder: false } as any
  const folderItem = { type: 'other', isFolder: true } as any

  it('matches all', () => {
    expect(matchesCategoryFilter(imageItem, 'all')).toBe(true)
  })

  it('matches specific category', () => {
    expect(matchesCategoryFilter(imageItem, 'image')).toBe(true)
    expect(matchesCategoryFilter(imageItem, 'video')).toBe(false)
  })

  it('excludes folders from category filter', () => {
    expect(matchesCategoryFilter(folderItem, 'all')).toBe(true)
    expect(matchesCategoryFilter(folderItem, 'image')).toBe(false)
  })
})

describe('formatErrorMessage', () => {
  it('formats Error objects', () => {
    expect(formatErrorMessage(new Error('test'), 'fallback')).toBe('test')
  })

  it('formats string errors', () => {
    expect(formatErrorMessage('string error', 'fallback')).toBe('string error')
  })

  it('returns fallback for unknown', () => {
    expect(formatErrorMessage(null, 'fallback')).toBe('fallback')
    expect(formatErrorMessage(42, 'fallback')).toBe('fallback')
  })
})
