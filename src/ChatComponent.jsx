import { useState, useEffect } from 'react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { messageBaseUrl } from "./Url";
import * as signalR from "@microsoft/signalr";
// import Box from "./Box";

// eslint-disable-next-line react/prop-types
export const ChatComponent = ({ name, id, token }) => {
    const [connection, setConnection] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messageToBeSent, setmessageToBeSent] = useState('');
    const [editedMessage, setEditedMessage] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [quotedMessageId, setQuotedMessageId] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [processedMessageIds, setProcessedMessageIds] = useState(new Set());

    const addMessageIfNew = (message) => {
        if (!processedMessageIds.has(message.id)) {
            setMessages(prevMessages => [...prevMessages, message]);
            setProcessedMessageIds(prevIds => new Set(prevIds.add(message.id)));
        }
    };

    useEffect(() => {
        if (id) {
            console.log("...HubConnectionBuilder started");
            const newConnection = new HubConnectionBuilder()
                .withUrl(messageBaseUrl + `chat?userId=${encodeURIComponent(id)}`, {
                    accessTokenFactory: () => token
                })
                .withAutomaticReconnect()
                .configureLogging(signalR.LogLevel.Trace)
                .build();
            console.log(newConnection, "newConnection");
            console.log("...HubConnectionBuilder end");

            console.log("... starting the connection, invoking onConnectedAsync")
            newConnection.start()
                .then(() => {
                    console.log(`${name} Connected!`);

                    // invoking ReceiveMessage here after receiving the message
                    newConnection.on('ReceiveMessage', (message) => {
                        console.log("message", message);
                        addMessageIfNew(message);

                        // Invoke SendDelivered here after receiving the message
                        if (message.recipientUsers && message.recipientUsers.includes(id) || message.receiverId === id) {
                            const messageId = message.id;
                            newConnection.invoke('SendDelivered', messageId)
                                .then(() => {
                                    console.log('*****SendDelivered method invoked successfully for id: ', messageId);
                                })
                                .catch(error => {
                                    console.error('*****Error invoking SendDelivered method:', error);
                                });
                        }
                    });

                    newConnection.on('ReceiveQuoteInReply', (message) => {
                        console.log("message", message);
                        addMessageIfNew(message);

                        // Invoke SendDelivered here after receiving the message
                        if (message.receiverId === id) {
                            const messageId = message.id;
                            newConnection.invoke('SendDelivered', messageId)
                                .then(() => {
                                    console.log('*****SendDelivered method invoked successfully for id: ', messageId);
                                })
                                .catch(error => {
                                    console.error('*****Error invoking SendDelivered method:', error);
                                });
                        }
                    });

                    newConnection.on('ReceiveDelivered', (deliveredMessage) => {
                        console.log("---ReceiveDelivered is called", deliveredMessage)

                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === deliveredMessage.id) {
                                    return {
                                        ...msg,
                                        isDelivered: true
                                    };
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on('ReceiveSeen', (deliveredMessage) => {
                        console.log("---ReceiveSeen is called", deliveredMessage)

                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === deliveredMessage.id) {
                                    return {
                                        ...msg,
                                        isRead: true
                                    };
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on('ReceiveDeleted', (message) => {
                        console.log("---ReceiveDeleted is called", message)

                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === message.id) {
                                    // Check the deletion status and update message content accordingly
                                    if (message.deletedForSelf && !message.deletedForBoth) {
                                        return { ...msg, messageContent: "This message has been deleted for you." };
                                    } else if (message.deletedForBoth) {
                                        return { ...msg, messageContent: "This message has been deleted for both." };
                                    }
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on('ReceiveEdit', (editedMessage) => {
                        console.log("---ReceiveEdit called", editedMessage)
                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === editedMessage.id) {
                                    return {
                                        ...msg,
                                        messageContent: editedMessage.messageContent
                                    };
                                }
                                return msg;
                            });
                        });
                    })

                    newConnection.on('ReceiveRestoreMessage', (message) => {
                        console.log("---ReceiveRestoreMessage is called", message)

                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === message.id) {
                                    return message;
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on("ReceiveUnreadCount", (count) => {
                        console.log("---ReceiveUnreadCount is called", count)
                        setUnreadCount(count.TotalUnreadConversationCount)
                    })

                    newConnection.on("ReceiveUserOnlineStatus", (count) => {
                        console.log("---ReceiveUserOnlineStatus is called", count)
                    })

                    newConnection.on("ReceiveTimeZone", (res) => {
                        console.log("---ReceiveTimeZone is called", res)
                    })
                })

                .catch(e => console.log('Connection failed: ', e));

            setConnection(newConnection);

            console.log("... onConnectedAsync end")

            return () => {
                console.log("...CONNECTION STOP CALLED....")

                newConnection.stop();
            };
        }
    }, [id, name, token]);

    const sendMessage = async () => {
        try {
            if (connection) {
                console.log("Attempting to send message:", recipientId, messageToBeSent);

                const messageRequest = {
                    ReceiverId: recipientId,
                    MessageContent: messageToBeSent
                }

                await connection.invoke('SendMessage', messageRequest);
                console.log("Message sent:", recipientId, messageToBeSent);
                setmessageToBeSent('');
            }
        } catch (error) {
            console.error("----sendMessageError-----", error);
        }
    };

    const sendQuotedMessage = async () => {
        try {
            if (connection) {
                console.log("Attempting to send Quoted Message:", recipientId, messageToBeSent);
                const messageRequest = {
                    ReceiverId: recipientId,
                    MessageContent: messageToBeSent,
                    QuotedMessageId: quotedMessageId
                }
                await connection.invoke('SendQuoteInReply', messageRequest);
            }

        } catch (error) {
            console.error("----sendQuotedMessageError-----", error);
        }
    }

    const editMessage = async (id) => {
        try {
            if (connection) {
                console.log("Attempting to Edit message: ", editedMessage, id);
                const messageRequest = {
                    MessageContent: editedMessage,
                    MessageId: id
                };

                await connection.invoke('SendEdit', messageRequest);
                console.log("Edit Message: sent ",);
                setEditedMessage('');
            }
        } catch (error) {
            console.error("----Edit Message Error-----", error);
        }
    }

    const viewMessage = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to send read message:", messageId);
                await connection.invoke('SendSeen', messageId);
            }
        } catch (error) {
            console.log("*** Error while sending read", error);
        }
    }

    const deleteForBoth = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to delete message for both:", messageId);
                await connection.invoke('DeleteBoth', messageId);
            }
        } catch (error) {
            console.log("*** Error while deleting ", error);

        }
    }

    const deleteForSelf = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to delete message for self:", messageId);
                await connection.invoke('DeleteSelf', messageId);
            }
        } catch (error) {
            console.log("*** Error while deleting ", error);
        }
    }

    const restoreMessage = async (messageId) => {
        const messageRestoreRequest = {
            MessageId: messageId,
            RequestDate: new Date().toISOString()
        };

        try {
            if (connection) {
                console.log("Attempting to Restore message:", messageRestoreRequest);
                await connection.invoke('SendRestoreMessage', messageRestoreRequest);
            }
        } catch (error) {
            console.log("*** Error while Restoring ", error);
        }
    }

    const fetchUnreadCount = async () => {
        try {
            if (connection) {
                console.log("Attempting to fetch UnreadCount:");
                await connection.invoke('SendUnreadCount');
            }
        } catch (error) {
            console.log("*** Error while Fetching Unread Count", error);

        }
    }

    const sendTimeZone = async () => {
        const timezone = {
            UserId: recipientId,
            TimeZone: "PST"
        }

        try {
            if (connection) {
                console.log("Attempting to Send Time Zone:", timezone);
                await connection.invoke('SendTimeZone', timezone);
            }
        }
        catch (error) {
            console.log("*** Error while Fetching Unread Count", error);

        }
    }

    return (
        <div>
            <div>
                <input
                    type="text"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="Id"
                />
                <input
                    type="text"
                    value={messageToBeSent}
                    onChange={(e) => setmessageToBeSent(e.target.value)}
                    placeholder="Type your message..."
                />
                <button onClick={sendMessage}>Send</button>
                <p>Reply To A Message</p>
                <input
                    type="text"
                    value={quotedMessageId}
                    onChange={(e) => setQuotedMessageId(e.target.value)}
                    placeholder="Id"
                />
                <button onClick={sendQuotedMessage}>send quoted message</button>

            </div>
            <div>
                <h3>Unread Count</h3>
                <button onClick={fetchUnreadCount}>Fetch</button>
                <p>{unreadCount}</p>
            </div>
            <br />
            <div>
                <button onClick={() => sendTimeZone()}>Send Time Zone</button>
            </div>
            <div>
                {messages.map(msg => (
                    <div key={msg.id}>
                        {msg.quotedMessageId === null ?
                            <p>
                                {msg.senderId} {" ===> "}
                                {msg.messageContent} {" "}
                            </p>
                            :
                            <p>
                                {msg.senderId} {" ===> "}
                                {"Original: "} {" "}{msg.quotedMessageContent} {" ||| "}
                                {"Reply"} {" "} {msg.messageContent} {" "}
                            </p>}
                        <div>
                            <span><strong>Message Status:</strong></span>
                            {msg.senderId === id ? msg.isDelivered ? <span><u>Delivered</u></span> : <span><u>Not Delivered</u></span> : ''}
                            {" "}
                            {msg.senderId === id ?
                                msg.isRead ? <span><u>Read</u></span> : <span><u>Not Read</u></span>
                                :
                                <>
                                    <button onClick={() => viewMessage(msg.id)}>View</button>
                                </>
                            }
                        </div>
                        {msg.senderId === id ?
                            <>
                                <input
                                    type="text"
                                    value={editedMessage}
                                    onChange={(e) => setEditedMessage(e.target.value)}
                                    placeholder={msg.messageContent}
                                />
                                <button onClick={() => editMessage(msg.id)}>Edit Message</button>
                            </>
                            : ''}
                        <br />
                        {msg.senderId === id ?
                            <span>
                                <button onClick={() => deleteForBoth(msg.id)}>Delete for both </button>
                                <button onClick={() => deleteForSelf(msg.id)}>Delete for me </button>
                                <button onClick={() => restoreMessage(msg.id)}>Restore message</button>
                            </span>
                            :
                            <span>
                                <button onClick={() => deleteForSelf(msg.id)}> Delete for me </button>
                                <button onClick={() => restoreMessage(msg.id)}>Restore message</button>
                            </span>

                        }

                        <p>----------------------------------------------</p>
                    </div>
                ))}
            </div>
        </div >
    );

}