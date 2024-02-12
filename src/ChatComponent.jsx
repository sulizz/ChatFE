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
    const [groupId, setGroupId] = useState('');
    const [userIdsList, setUserIdsList] = useState('');

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

                    newConnection.on("ReceiveGroupMessage", (message) => {
                        console.log("---ReceiveGroupMessage is called", message)
                        addMessageIfNew(message);
                        // Invoke SendDelivered here after receiving the message

                        const isRecipient = message.recipientUsers.some(recipient => recipient.id === id);

                        // Invoke SendDelivered here after receiving the message
                        if (isRecipient || message.receiverId === id) {

                            const messageId = message.id;
                            console.table('*****Invoking method SendGroupDelivered invoked successfully for Messageid: ', messageId, 'userId', id, 'groupId', message.groupId);

                            newConnection.invoke('SendGroupDelivered', messageId, message.groupId)
                                .then(() => {
                                    console.log('*****SendGroupDelivered method invoked successfully for id: ', messageId);
                                })
                                .catch(error => {
                                    console.error('*****Error invoking SendGroupDelivered method:', error);
                                });
                        }
                    })

                    newConnection.on("ReceiveGroupQuoteInReply", (message) => {
                        console.log("---ReceiveGroupQuoteInReply is called", message)
                        addMessageIfNew(message);
                        // Invoke SendDelivered here after receiving the message

                        const isRecipient = message.recipientUsers.some(recipient => recipient.id === id);

                        // Invoke SendDelivered here after receiving the message
                        if (isRecipient || message.receiverId === id) {

                            const messageId = message.id;
                            console.table('*****Invoking method SendGroupDelivered invoked successfully for Messageid: ', messageId, 'userId', id, 'groupId', message.groupId);

                            newConnection.invoke('SendGroupDelivered', messageId, message.groupId)
                                .then(() => {
                                    console.log('*****SendGroupDelivered method invoked successfully for id: ', messageId);
                                })
                                .catch(error => {
                                    console.error('*****Error invoking SendGroupDelivered method:', error);
                                });
                        }
                    })

                    newConnection.on("ReceiveGroupDelivered", (res) => {
                        console.log("---ReceiveGroupDelivered is called", res)
                    })

                    newConnection.on("ReceiveGroupSeen", (res) => {
                        console.log("---ReceiveGroupSeen is called", res)
                    })

                    // ------------------------- V2 methods -------------------------- 
                    newConnection.on('ReceiveMessageV2', (message) => {
                        console.log("ReceiveMessageV2", message);
                        addMessageIfNew(message);

                        // Check if the logged-in user is a recipient of the message
                        const isRecipient = message.recipientUsers.some(recipient => recipient.id === id);

                        // Invoke SendDelivered here after receiving the message
                        if (isRecipient || message.receiverId === id) {
                            const messageId = message.id;
                            newConnection.invoke('SendDeliveredV2', messageId)
                                .then(() => {
                                    console.log('*****SendDeliveredV2 method invoked successfully for id: ', messageId);
                                })
                                .catch(error => {
                                    console.error('*****Error invoking SendDeliveredV2 method:', error);
                                });
                        }
                    });

                    newConnection.on('ReceiveQuoteInReplyV2', (message) => {
                        console.log("ReceiveQuoteInReplyV2", message);
                        addMessageIfNew(message);

                        // Invoke SendDelivered here after receiving the message
                        if (message.receiverId === id) {
                            const messageId = message.id;
                            newConnection.invoke('SendDeliveredV2', messageId)
                                .then(() => {
                                    console.log('*****SendDeliveredV2 method invoked successfully for id: ', messageId);
                                })
                                .catch(error => {
                                    console.error('*****Error invoking SendDeliveredV2 method:', error);
                                });
                        }
                    });



                    newConnection.on('ReceiveDeliveredV2', (deliveredMessage) => {
                        console.log("---ReceiveDeliveredV2 is called", deliveredMessage)

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

                    newConnection.on('ReceiveSeenV2', (deliveredMessage) => {
                        console.log("---ReceiveSeenV2 is called", deliveredMessage)

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

                    newConnection.on('ReceiveDeletedV2', (message) => {
                        console.log("---ReceiveDeletedV2 is called", message)

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

                    newConnection.on('ReceiveEditV2', (editedMessage) => {
                        console.log("---ReceiveEditV2 called", editedMessage)
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

                    newConnection.on('ReceiveRestoreMessageV2', (message) => {
                        console.log("---ReceiveRestoreMessageV2 is called", message)

                        setMessages(prevMessages => {
                            return prevMessages.map(msg => {
                                if (msg.id === message.id) {
                                    return message;
                                }
                                return msg;
                            });
                        });
                    });

                    newConnection.on("ReceiveUnreadCountV2", (count) => {
                        console.log("---ReceiveUnreadCountV2 is called", count)
                        setUnreadCount(count.TotalUnreadConversationCount)
                    })

                    newConnection.on("ReceiveUserOnlineStatusV2", (count) => {
                        console.log("---ReceiveUserOnlineStatusV2 is called", count)
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

    const sendMessageV2 = async () => {
        try {
            if (connection) {
                console.log("Attempting to send message:", recipientId, messageToBeSent);

                const messageRequest = {
                    ReceiverId: recipientId,
                    MessageContent: messageToBeSent
                }

                await connection.invoke('SendMessageV2', messageRequest);
                console.log("Message sent SendMessageV2:", recipientId, messageToBeSent);
                setmessageToBeSent('');
            }
        } catch (error) {
            console.error("----sendMessageError-----", error);
        }
    };

    const sendQuotedMessageV2 = async () => {
        try {
            if (connection) {
                console.log("Attempting to send Quoted Message: SendQuoteInReplyV2", recipientId, messageToBeSent);
                const messageRequest = {
                    ReceiverId: recipientId,
                    MessageContent: messageToBeSent,
                    QuotedMessageId: quotedMessageId
                }
                await connection.invoke('SendQuoteInReplyV2', messageRequest);
            }

        } catch (error) {
            console.error("----sendQuotedMessageError-----", error);
        }
    }

    const editMessageV2 = async (id, groupId) => {
        try {
            if (connection) {
                console.log("Attempting to Edit message: ", editedMessage, id, groupId);
                const messageRequest = {
                    MessageContent: editedMessage,
                    MessageId: id,
                    GroupId: groupId
                };

                await connection.invoke('SendEditV2', messageRequest);
                console.log("Edit Message: SendEditV2 sent ",);
                setEditedMessage('');
            }
        } catch (error) {
            console.error("----Edit Message Error-----", error);
        }
    }

    const viewMessageV2 = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to send read message: v2 ", messageId);
                await connection.invoke('SendSeenV2', messageId);
            }
        } catch (error) {
            console.log("*** Error while sending read v2", error);
        }
    }

    const deleteForBothV2 = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to delete message for both V2:", messageId);
                await connection.invoke('DeleteBothV2', messageId);
            }
        } catch (error) {
            console.log("*** Error while deleting deleteForBothV2 ", error);

        }
    }

    const deleteForSelfV2 = async (messageId) => {
        try {
            if (connection) {
                console.log("Attempting to delete message for self: deleteForSelfV2", messageId);
                await connection.invoke('DeleteSelfV2', messageId);
            }
        } catch (error) {
            console.log("*** Error while deleting deleteForSelfV2", error);
        }
    }

    const restoreMessageV2 = async (messageId, groupId) => {
        const messageRestoreRequest = {
            MessageId: messageId,
            RequestDate: new Date().toISOString(),
            GroupId: groupId
        };

        try {
            if (connection) {
                console.log("Attempting to Restore message: V2", messageRestoreRequest);
                await connection.invoke('SendRestoreMessageV2', messageRestoreRequest);
            }
        } catch (error) {
            console.log("*** Error while Restoring V2", error);
        }
    }

    const fetchUnreadCountV2 = async () => {
        try {
            if (connection) {
                console.log("Attempting to fetch UnreadCount V2: ");
                await connection.invoke('SendUnreadCountV2');
            }
        } catch (error) {
            console.log("*** Error while Fetching Unread Count V2", error);

        }
    }

    const sendGroupQuoteInReply = async () => {
        try {
            if (connection) {
                const messageRequest = {
                    GroupId: groupId,
                    MessageContent: messageToBeSent,
                    QuotedMessageId: quotedMessageId,
                }
                console.log("Attempting to send Group Quoted Message: SendGroupQuoteInReply", messageRequest);
                await connection.invoke('SendGroupQuoteInReply', messageRequest);
            }

        } catch (error) {
            console.error("----sendQuotedMessageError-----", error);
        }
    }

    // ------------------- v2 ----------------------------------------------

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

    const editMessage = async (id, groupId) => {
        try {
            if (connection) {
                console.log("Attempting to Edit message: ", editedMessage, id, groupId);
                const messageRequest = {
                    MessageContent: editedMessage,
                    MessageId: id,
                    GroupId: groupId
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

    const viewGroupMessage = async (messageId, groupId) => {
        try {
            if (connection) {
                console.log("Attempting to send read Group Message:", messageId, groupId);
                await connection.invoke('SendGroupSeen', messageId, groupId);
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

    const restoreMessage = async (messageId, groupId) => {
        const messageRestoreRequest = {
            MessageId: messageId,
            RequestDate: new Date().toISOString(),
            GroupId: groupId
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

    const sendGroupMessage = async () => {
        // Check if the userIdsList is not empty
        const userIdsArray = userIdsList.trim() ? userIdsList.split(',').map(id => id.trim()) : null;

        const message = {
            GroupId: groupId,
            MessageContent: messageToBeSent,
            UserIds: userIdsArray
        }

        try {
            if (connection) {
                console.log("Attempting to Send Group Message:", message);
                await connection.invoke('SendGroupMessage', message);
            }
        } catch (error) {
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
                <button onClick={sendMessageV2}>Send V2</button>

                <p>Reply To A Message</p>
                <input
                    type="text"
                    value={quotedMessageId}
                    onChange={(e) => setQuotedMessageId(e.target.value)}
                    placeholder="Id"
                />
                <button onClick={sendQuotedMessage}>send quoted message</button>
                <button onClick={sendQuotedMessageV2}>send quoted message V2</button>
                <button onClick={sendGroupQuoteInReply}>send Group quoted message</button>
                <p>Send Group Message</p>
                <input
                    type="text"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    placeholder="Group Id"
                />
                <input
                    type="text"
                    value={userIdsList}
                    onChange={(e) => setUserIdsList(e.target.value)}
                    placeholder="Enter user IDs separated by commas"
                />
                <button onClick={sendGroupMessage}>send Group Messsage</button>

            </div>
            <div>
                <h3>Unread Count</h3>
                <button onClick={fetchUnreadCount}>Fetch</button>
                <button onClick={fetchUnreadCountV2}>FetchV2</button>

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
                                    {
                                        msg.groupId ?
                                            <button onClick={() => viewGroupMessage(msg.id, msg.groupId)}>View Group Message</button>
                                            :
                                            <>
                                                <button onClick={() => viewMessage(msg.id)}>View</button>
                                                <button onClick={() => viewMessageV2(msg.id)}>View V2</button>

                                            </>
                                    }
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
                                <button onClick={() => editMessage(msg.id, msg.groupId)}>Edit Message</button>
                                <button onClick={() => editMessageV2(msg.id, msg.groupId)}>Edit Message V2</button>
                            </>
                            : ''}
                        <br />
                        {msg.senderId === id ?
                            <>
                                <div>
                                    <button onClick={() => deleteForBoth(msg.id)}>Delete for both </button>
                                    <button onClick={() => deleteForSelf(msg.id)}>Delete for me </button>
                                    <button onClick={() => restoreMessage(msg.id, msg.groupId)}>Restore message</button>
                                </div>
                                <div>
                                    <button onClick={() => deleteForBothV2(msg.id)}>Delete for both V2</button>
                                    <button onClick={() => deleteForSelfV2(msg.id)}>Delete for me V2</button>
                                    <button onClick={() => restoreMessageV2(msg.id, msg.groupId)}>Restore message V2</button>
                                </div>
                            </>

                            :
                            <span>
                                <button onClick={() => deleteForSelf(msg.id)}> Delete for me </button>
                                <button onClick={() => restoreMessage(msg.id)}>Restore message</button>
                                <button onClick={() => deleteForSelfV2(msg.id)}> Delete for me V2</button>
                                <button onClick={() => restoreMessageV2(msg.id)}>Restore message V2</button>
                            </span>

                        }

                        <p>----------------------------------------------</p>
                    </div>
                ))}
            </div>
        </div >
    );

}