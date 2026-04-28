"""
LangChain Integration for Giftkart AI Applications
This service provides AI-powered features using LangChain with local models
"""

import os
from langchain.llms import HuggingFaceHub
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import TextLoader
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain

# Configuration
HUGGINGFACE_API_TOKEN = os.getenv('HUGGINGFACE_API_TOKEN', '')
CHROMA_PERSIST_DIR = os.getenv('CHROMA_PERSIST_DIR', './chroma_db')

# Initialize embeddings (local model)
def initialize_embeddings():
    """Initialize local embeddings using sentence-transformers"""
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={'device': 'cpu'}
    )
    print("Initialized local embeddings model")
    return embeddings

# Initialize LLM (can use local or HuggingFace)
def initialize_llm(use_local=True):
    """Initialize LLM - local or HuggingFace"""
    if use_local:
        # For local models, you would use something like llama-cpp-python
        # This is a placeholder - actual implementation depends on local model setup
        print("Local LLM would be initialized here (requires llama-cpp-python or similar)")
        return None
    else:
        # Use HuggingFace Hub
        if HUGGINGFACE_API_TOKEN:
            llm = HuggingFaceHub(
                repo_id="google/flan-t5-large",
                huggingfacehub_api_token=HUGGINGFACE_API_TOKEN
            )
            print("Initialized HuggingFace LLM")
            return llm
        else:
            print("No HuggingFace API token provided, using local mode")
            return None

# Gift Recommendation Chain
class GiftRecommendationChain:
    """LangChain for gift recommendations"""
    
    def __init__(self, embeddings):
        self.embeddings = embeddings
        self.vectorstore = None
        self.qa_chain = None
        
    def load_product_data(self, product_data_file):
        """Load product data for vector search"""
        loader = TextLoader(product_data_file)
        documents = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        texts = text_splitter.split_documents(documents)
        
        self.vectorstore = Chroma.from_documents(
            documents=texts,
            embedding=self.embeddings,
            persist_directory=CHROMA_PERSIST_DIR
        )
        print(f"Loaded {len(texts)} product chunks into vector store")
        
    def create_recommendation_chain(self, llm):
        """Create RAG chain for gift recommendations"""
        if not self.vectorstore:
            raise ValueError("Vector store not initialized. Load product data first.")
            
        retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        
        prompt_template = """
        Based on the following context about gift products, recommend the best gift for the given situation:
        
        Context: {context}
        
        Situation: {question}
        
        Provide a recommendation with:
        1. Product name
        2. Why it's suitable
        3. Price range
        4. Any special features
        
        Recommendation:
        """
        
        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=retriever,
            chain_type_kwargs={"prompt": PROMPT}
        )
        print("Created gift recommendation chain")
        
    def get_recommendation(self, query):
        """Get gift recommendation"""
        if not self.qa_chain:
            raise ValueError("Chain not initialized. Create chain first.")
            
        result = self.qa_chain.run(query)
        return result

# Sentiment Analysis Chain
class SentimentAnalysisChain:
    """LangChain for sentiment analysis of reviews"""
    
    def __init__(self, llm):
        self.llm = llm
        
    def analyze_sentiment(self, text):
        """Analyze sentiment of review text"""
        prompt = f"""
        Analyze the sentiment of the following review and provide:
        1. Overall sentiment (positive/negative/neutral)
        2. Key positive points
        3. Key negative points
        4. Rating suggestion (1-5)
        
        Review: {text}
        
        Analysis:
        """
        
        result = self.llm(prompt)
        return result

# Conversational AI Chain
class ConversationalAI:
    """LangChain for conversational AI (chatbot)"""
    
    def __init__(self, llm):
        self.llm = llm
        self.memory = ConversationBufferMemory()
        self.chain = ConversationChain(
            llm=llm,
            memory=self.memory,
            verbose=True
        )
        
    def chat(self, user_input):
        """Chat with the AI"""
        response = self.chain.predict(input=user_input)
        return response
        
    def clear_memory(self):
        """Clear conversation memory"""
        self.memory.clear()
        print("Conversation memory cleared")

# Price Prediction Chain (Simple)
class PricePredictionChain:
    """LangChain for price prediction"""
    
    def __init__(self, llm):
        self.llm = llm
        
    def predict_price(self, product_description, category, features):
        """Predict price based on product details"""
        prompt = f"""
        Based on the following product details, suggest a reasonable price range:
        
        Product: {product_description}
        Category: {category}
        Features: {features}
        
        Provide:
        1. Suggested minimum price
        2. Suggested maximum price
        3. Recommended price
        4. Reasoning
        
        Price Prediction:
        """
        
        result = self.llm(prompt)
        return result

# Initialize all services
def initialize_langchain_services():
    """Initialize all LangChain services"""
    print("Initializing LangChain services...")
    
    # Initialize embeddings
    embeddings = initialize_embeddings()
    
    # Initialize LLM
    llm = initialize_llm(use_local=False)
    
    services = {
        'embeddings': embeddings,
        'llm': llm,
        'gift_recommendation': GiftRecommendationChain(embeddings),
        'sentiment_analysis': SentimentAnalysisChain(llm) if llm else None,
        'conversational_ai': ConversationalAI(llm) if llm else None,
        'price_prediction': PricePredictionChain(llm) if llm else None
    }
    
    print("LangChain services initialized successfully")
    return services

if __name__ == "__main__":
    # Test initialization
    services = initialize_langchain_services()
    print("\nAvailable services:")
    for service_name, service in services.items():
        print(f"- {service_name}: {'✓' if service else '✗ (needs LLM)'}")
