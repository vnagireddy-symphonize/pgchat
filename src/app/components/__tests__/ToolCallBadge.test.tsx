import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ToolCallBadge from '../ToolCallBadge'

const args = { sql: 'SELECT * FROM users LIMIT 10' }

describe('ToolCallBadge', () => {
  it('shows the tool name without server prefix', () => {
    render(<ToolCallBadge name="postgres__query" args={args} />)
    expect(screen.getByText('query')).toBeInTheDocument()
  })

  it('shows a spinner when result is undefined (pending)', () => {
    const { container } = render(<ToolCallBadge name="postgres__query" args={args} />)
    // spinner has animate-spin class
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows a checkmark when result is provided', () => {
    const { container } = render(
      <ToolCallBadge name="postgres__query" args={args} result="id,name\n1,Alice" />
    )
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument()
    // checkmark SVG path
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies amber styles when pending', () => {
    const { container } = render(<ToolCallBadge name="postgres__query" args={args} />)
    const button = container.querySelector('button')!
    expect(button.className).toContain('amber')
  })

  it('applies emerald styles when completed', () => {
    const { container } = render(
      <ToolCallBadge name="postgres__query" args={args} result="ok" />
    )
    const button = container.querySelector('button')!
    expect(button.className).toContain('emerald')
  })

  it('applies red styles on error result', () => {
    const { container } = render(
      <ToolCallBadge name="postgres__query" args={args} result="Error: connection refused" />
    )
    const button = container.querySelector('button')!
    expect(button.className).toContain('red')
  })

  it('expands to show args on click', async () => {
    render(<ToolCallBadge name="postgres__query" args={args} result="ok" />)
    expect(screen.queryByText('Arguments')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Arguments')).toBeInTheDocument()
    expect(screen.getByText(/SELECT \* FROM users/)).toBeInTheDocument()
  })

  it('shows result section when expanded and result is present', async () => {
    render(<ToolCallBadge name="postgres__query" args={args} result="id,name\n1,Alice" />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Result')).toBeInTheDocument()
    expect(screen.getByText(/id,name/)).toBeInTheDocument()
  })

  it('collapses on second click', async () => {
    render(<ToolCallBadge name="postgres__query" args={args} result="ok" />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Arguments')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Arguments')).not.toBeInTheDocument()
  })
})
