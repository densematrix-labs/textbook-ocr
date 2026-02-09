import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { Footer } from '../components/Footer'

describe('LoadingSpinner', () => {
  it('renders with default message', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('upload.processing')).toBeInTheDocument()
  })

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Custom loading..." />)
    expect(screen.getByText('Custom loading...')).toBeInTheDocument()
  })

  it('renders with hint', () => {
    render(<LoadingSpinner hint="This may take a while" />)
    expect(screen.getByText('This may take a while')).toBeInTheDocument()
  })
})

describe('MarkdownPreview', () => {
  it('renders markdown content', () => {
    render(<MarkdownPreview content="# Hello World" />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('renders paragraph text', () => {
    render(<MarkdownPreview content="This is a paragraph" />)
    expect(screen.getByText('This is a paragraph')).toBeInTheDocument()
  })

  it('renders lists', () => {
    render(<MarkdownPreview content="- Item 1\n- Item 2" />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('renders footer content', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    )
    expect(screen.getByText('footer.poweredBy')).toBeInTheDocument()
    expect(screen.getByText('footer.privacy')).toBeInTheDocument()
    expect(screen.getByText('footer.terms')).toBeInTheDocument()
  })
})
