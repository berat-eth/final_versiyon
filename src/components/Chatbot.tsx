import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Animated,
  Dimensions,
  Modal,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ChatbotService } from '../services/ChatbotService';
import { AnythingLLMService } from '../services/AnythingLLMService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatbotProps {
  navigation?: any;
  onClose?: () => void;
}

export interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  type?: 'text' | 'quick_reply' | 'product' | 'order' | 'image';
  data?: any;
  quickReplies?: QuickReply[];
}

export interface QuickReply {
  id: string;
  text: string;
  action: string;
  data?: any;
}

const { width, height } = Dimensions.get('window');

export const Chatbot: React.FC<ChatbotProps> = ({ navigation, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Typing indicator için animated values'ları component seviyesinde tanımla
  const typingDotOpacity = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3)
  ]).current;

  useEffect(() => {
    loadChatHistory();
    initializeBot();
    startPulseAnimation();
    checkOnlineStatus();
    checkLLMStatus();
  }, []);

  const checkLLMStatus = async () => {
    try {
      const config = await AnythingLLMService.getConfig();
      setLlmEnabled(config?.enabled || false);
    } catch (error) {
      console.error('LLM status check error:', error);
      setLlmEnabled(false);
    }
  };

  // LLM durumunu yenile (ayarlar sayfasından dönüşte)
  useEffect(() => {
    const focusHandler = () => {
      checkLLMStatus();
    };

    // Navigation focus event listener (eğer navigation prop'u varsa)
    if (navigation?.addListener) {
      const unsubscribe = navigation.addListener('focus', focusHandler);
      return unsubscribe;
    }
  }, [navigation]);

  const checkOnlineStatus = () => {
    // Basit online/offline kontrolü
    const currentHour = new Date().getHours();
    const isWorkingHours = currentHour >= 9 && currentHour <= 18;
    setIsOnline(isWorkingHours);
    
    // Her 5 dakikada bir kontrol et
    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const workingHours = hour >= 9 && hour <= 18;
      setIsOnline(workingHours);
    }, 300000); // 5 dakika

    return () => clearInterval(interval);
  };

  useEffect(() => {
    if (isVisible) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [messages, isVisible]);

  // Typing animasyon kontrolü
  useEffect(() => {
    if (isTyping) {
      const animations = typingDotOpacity.map((opacity, index) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        )
      );
      
      Animated.parallel(animations).start();
      
      return () => {
        // Animasyonları durdur
        animations.forEach(animation => animation.stop());
      };
    }
  }, [isTyping, typingDotOpacity]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadChatHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('chatHistory');
      if (history) {
        const parsedHistory = JSON.parse(history);
        setMessages(parsedHistory.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (newMessages: ChatMessage[]) => {
    try {
      // Sadece son 50 mesajı kaydet (performans için)
      const limitedMessages = newMessages.slice(-50);
      await AsyncStorage.setItem('chatHistory', JSON.stringify(limitedMessages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const initializeBot = () => {
    const welcomeMessage: ChatMessage = {
      id: `bot-welcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: '👋 Merhaba! Size nasıl yardımcı olabilirim?',
      isBot: true,
      timestamp: new Date(),
      type: 'quick_reply',
      quickReplies: [
        { id: '1', text: '📦 Sipariş Takibi', action: 'order_tracking' },
        { id: '2', text: '🔍 Ürün Arama', action: 'product_search' },
        { id: '3', text: '❓ S.S.S.', action: 'faq' },
        { id: '4', text: '🎧 Canlı Destek', action: 'live_support' },
      ]
    };

    setMessages(prev => {
      if (prev.length === 0) {
        return [welcomeMessage];
      }
      return prev;
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addMessage = (message: ChatMessage) => {
    // Unique ID garantisi için timestamp + random number
    const uniqueMessage = {
      ...message,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    setMessages(prev => {
      const newMessages = [...prev, uniqueMessage];
      saveChatHistory(newMessages);
      return newMessages;
    });

    if (!isVisible && uniqueMessage.isBot) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const deleteMessage = (messageId: string) => {
    Alert.alert(
      'Mesajı Sil',
      'Bu mesajı silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            setMessages(prev => {
              const newMessages = prev.filter(msg => msg.id !== messageId);
              saveChatHistory(newMessages);
              return newMessages;
            });
            setSelectedMessageId(null);
          },
        },
      ]
    );
  };

  const clearAllMessages = () => {
    Alert.alert(
      'Tüm Mesajları Sil',
      'Tüm sohbet geçmişini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Tümünü Sil',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            saveChatHistory([]);
            setSelectedMessageId(null);
            // Bot'u yeniden başlat
            setTimeout(() => {
              initializeBot();
            }, 100);
          },
        },
      ]
    );
  };

  const sendMessage = async (text: string, type: string = 'text') => {
    if (!text.trim() && type === 'text') return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      isBot: false,
      timestamp: new Date(),
      type: type as any,
    };

    addMessage(userMessage);
    setInputText('');
    setIsTyping(true);

    try {
      // AI ile mesaj işleme
      const response = await ChatbotService.processMessage(text, type);
      
      // Intent tespiti (analitik için)
      const intent = detectIntent(text.toLowerCase());
      
      // Analitik takip
      await ChatbotService.logChatInteraction(1, text, intent); // userId = 1 (guest)
      
      setTimeout(() => {
        setIsTyping(false);
        addMessage(response);
      }, 1000 + Math.random() * 1000); // Gerçekçi yazma süresi

    } catch (error) {
      console.error('❌ Chatbot send message error:', error);
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: '😔 Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin veya canlı desteğe bağlanın.',
        isBot: true,
        timestamp: new Date(),
        type: 'quick_reply',
        quickReplies: [
          { id: '1', text: '🔄 Tekrar Dene', action: 'retry' },
          { id: '2', text: '🎧 Canlı Destek', action: 'live_support' },
        ]
      };
      addMessage(errorMessage);
    }
  };

  // Basit intent tespiti (analitik için)
  const detectIntent = (message: string): string => {
    const intents = {
      greeting: ['merhaba', 'selam', 'hey', 'hi', 'hello', 'iyi günler', 'günaydın', 'iyi akşamlar'],
      order_tracking: ['sipariş', 'takip', 'nerede', 'kargo', 'teslimat', 'sipariş takibi', 'siparişim'],
      product_search: ['ürün', 'arama', 'bul', 'var mı', 'stok', 'fiyat', 'ürün arama'],
      campaigns: ['kampanya', 'indirim', 'kupon', 'çek', 'promosyon', 'fırsat', 'özel teklif'],
      support: ['yardım', 'destek', 'problem', 'sorun', 'şikayet', 'canlı destek'],
      payment: ['ödeme', 'para', 'kredi kartı', 'banka', 'ücret', 'fatura', 'taksit'],
      return: ['iade', 'değişim', 'geri', 'kusur', 'hasarlı', 'yanlış'],
      shipping: ['kargo', 'teslimat', 'gönderim', 'ulaştırma', 'adres'],
      account: ['hesap', 'profil', 'şifre', 'giriş', 'kayıt', 'üyelik'],
      goodbye: ['görüşürüz', 'hoşça kal', 'bye', 'teşekkür', 'sağ ol', 'kapanış']
    };

    // Sipariş numarası tespiti
    if (/\b\d{5,}\b/.test(message)) {
      return 'order_number';
    }

    // Intent tespiti
    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          return intent;
        }
      }
    }

    // Ürün arama tespiti
    if (message.length > 3) {
      return 'product_search_query';
    }

    return 'unknown';
  };

  const handleQuickReply = async (quickReply: QuickReply) => {
    // Navigasyon eylemi kontrolü
    if (quickReply.action.includes('navigate_') || 
        quickReply.action.includes('view_') || 
        quickReply.action === 'order_detail') {
      
      if (navigation) {
        await ChatbotService.handleNavigation(quickReply.action, navigation, quickReply.data);
        
        // Chatbot'u kapat
        toggleChatbot();
        
        // Başarı mesajı ekle
        const successMessage: ChatMessage = {
          id: `bot-success-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: `✅ ${quickReply.text} sayfasına yönlendiriliyorsunuz...`,
          isBot: true,
          timestamp: new Date(),
          type: 'text',
        };
        addMessage(successMessage);
        return;
      }
    }

    await sendMessage(quickReply.text, quickReply.action);
  };

  const toggleChatbot = () => {
    setIsVisible(!isVisible);
    if (!isVisible) {
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(animatedValue, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const minimizeChat = () => {
    setIsMinimized(true);
    Animated.timing(animatedValue, {
      toValue: 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const maximizeChat = () => {
    setIsMinimized(false);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const renderMessage = (message: ChatMessage) => {
    const isBot = message.isBot;
    const isSelected = selectedMessageId === message.id;
    
    return (
      <TouchableOpacity
        key={message.id}
        style={[
          styles.messageContainer,
          isBot ? styles.botMessageContainer : styles.userMessageContainer,
          isSelected && styles.selectedMessageContainer
        ]}
        onLongPress={() => setSelectedMessageId(isSelected ? null : message.id)}
        activeOpacity={0.7}
      >
        {isBot && (
          <View style={styles.botAvatar}>
            <Icon name="smart-toy" size={20} color={Colors.primary} />
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isBot ? styles.botBubble : styles.userBubble,
          isSelected && styles.selectedBubble
        ]}>
          <Text style={[
            styles.messageText,
            isBot ? styles.botText : styles.userText
          ]}>
            {message.text}
          </Text>
          
          {message.quickReplies && (
            <View style={styles.quickRepliesContainer}>
              {message.quickReplies.map((reply) => (
                <TouchableOpacity
                  key={reply.id}
                  style={styles.quickReplyButton}
                  onPress={() => handleQuickReply(reply)}
                >
                  <Text style={styles.quickReplyText}>{reply.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Delete button overlay */}
          {isSelected && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteMessage(message.id)}
            >
              <Icon name="delete" size={16} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
        
        {!isBot && (
          <View style={styles.userAvatar}>
            <Icon name="person" size={20} color={Colors.textOnPrimary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };


  const renderTypingIndicator = () => {
    return (
      <View style={[styles.messageContainer, styles.botMessageContainer]}>
        <View style={styles.botAvatar}>
          <Icon name="smart-toy" size={20} color={Colors.primary} />
        </View>
        <View style={[styles.messageBubble, styles.botBubble]}>
          <View style={styles.typingIndicator}>
            {typingDotOpacity.map((opacity, index) => (
              <Animated.View
                key={`typing-dot-${index}`}
                style={[styles.typingDot, { opacity }]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderFloatingButton = () => (
    <Animated.View style={[
      styles.floatingButton,
      { transform: [{ scale: pulseAnim }] }
    ]}>
      <TouchableOpacity
        style={styles.floatingButtonInner}
        onPress={toggleChatbot}
      >
        <Icon name="chat" size={24} color={Colors.textOnPrimary} />
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderChatWindow = () => (
    <Animated.View style={[
      styles.chatWindow,
      isMinimized && styles.minimizedChat,
      {
        transform: [{
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          })
        }],
        opacity: animatedValue,
      }
    ]}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.botAvatarLarge}>
            <Icon name="smart-toy" size={24} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.botName}>Huglu Asistan</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot,
                { backgroundColor: isOnline ? Colors.success : Colors.error }
              ]} />
              <Text style={styles.statusText}>
                {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
              </Text>
              {llmEnabled && (
                <View style={styles.llmBadge}>
                  <Text style={styles.llmBadgeText}>AI</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          {!isMinimized && messages.length > 0 && (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={clearAllMessages}
            >
              <Icon name="delete-sweep" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={isMinimized ? maximizeChat : minimizeChat}
          >
            <Icon 
              name={isMinimized ? "expand-more" : "expand-less"} 
              size={20} 
              color={Colors.textLight} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={toggleChatbot}
          >
            <Icon name="close" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
          >
            {messages.map(renderMessage)}
            {isTyping && renderTypingIndicator()}
          </ScrollView>

          {/* Input */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <View style={styles.inputRow}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={() => Alert.alert('Yakında', 'Dosya ekleme özelliği yakında aktif olacak!')}
              >
                <Icon name="attach-file" size={20} color={Colors.textLight} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.textInput}
                placeholder="Mesajınızı yazın..."
                placeholderTextColor={Colors.textLight}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive
                ]}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim()}
              >
                <Icon 
                  name="send" 
                  size={20} 
                  color={inputText.trim() ? Colors.textOnPrimary : Colors.textLight} 
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {!isVisible && renderFloatingButton()}
      {isVisible && renderChatWindow()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    ...Shadows.large,
  },
  floatingButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  chatWindow: {
    width: width * 0.9,
    maxWidth: 350,
    height: height * 0.7,
    maxHeight: 500,
    backgroundColor: Colors.background,
    borderRadius: 16,
    ...Shadows.large,
    overflow: 'hidden',
  },
  minimizedChat: {
    height: 60,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  botName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  llmBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  llmBadgeText: {
    fontSize: 10,
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  messagesContainer: {
    flex: 1,
    padding: Spacing.sm,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: Spacing.sm,
    borderRadius: 16,
  },
  botBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  botText: {
    color: Colors.text,
  },
  userText: {
    color: Colors.textOnPrimary,
  },
  quickRepliesContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  quickReplyButton: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  quickReplyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textLight,
    marginRight: 4,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  attachButton: {
    padding: Spacing.xs,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.border,
  },
  selectedMessageContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    margin: 2,
  },
  selectedBubble: {
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.error + '30',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
});
