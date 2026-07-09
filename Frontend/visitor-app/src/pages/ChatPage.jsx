import DashboardShell from '../components/dashboard/DashboardShell.jsx'
import ChatView from '../components/chat/ChatView.jsx'
import useChat from '../realtime/useChat.js'

export default function ChatPage() {
  const chat = useChat()
  return (
    <DashboardShell pageTitle="Team Chat" breadcrumbItems={['Communication', 'Chat']}>
      <ChatView chat={chat} />
    </DashboardShell>
  )
}
