import os
import csv
import random
import logging
import datetime
from pathlib import Path
from typing import List, Dict, Any

from faker import Faker
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


# --- 1. Setup LLM ---
# Make sure your OPENAI_API_KEY is set in your environment variables



# Load environment variables from .env file at the project root
load_dotenv()

llm = ChatOpenAI(model="gpt-4o", temperature=0.7)

# --- 2. Define Data Structures for Vendor and Prospect ---
class Vendor(BaseModel):
    """Details about the software vendor company."""
    name: str = Field(description="The name of the vendor company.")
    solution_name: str = Field(description="The name of their flagship software solution.")
    solution_description: str = Field(description="A brief, compelling description of what the software does.")
    key_features: List[str] = Field(description="A list of 3-5 key features of the software.")
    ideal_customer_profile: str = Field(description="A description of the vendor's ideal customer.")

class Prospect(BaseModel):
    """Details about the prospective customer."""
    name: str = Field(description="The name of the prospect company.")
    industry: str = Field(description="The industry the prospect operates in.")
    pain_points: List[str] = Field(description="A list of 2-3 specific business or operational pain points they face.")
    potential_need: str = Field(description="How the vendor's solution could potentially address their pain points.")

class Scenario(BaseModel):
    """Container for the generated vendor and prospect."""
    vendor: Vendor
    prospect: Prospect

# --- 3. Chain to Generate the Initial Scenario ---
def get_scenario_generator_chain():
    """Creates a chain to generate the vendor and prospect scenario."""
    logger.info("Creating scenario generator chain.")
    parser = JsonOutputParser(pydantic_object=Scenario)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert in B2B software sales. Your task is to generate a realistic and detailed scenario involving a software vendor and a prospective client. The vendor should have a clear product, and the prospect should have clear pain points that the vendor can solve. Format your response as a JSON object that strictly follows this schema: {schema}"),
        ("human", "Please generate a new B2B sales scenario for a vendor selling a solution in the {topic} space.")
    ])

    return prompt | llm | parser

# --- 4. Document Generation Logic ---
def get_document_generation_chain(doc_name: str, doc_description: str):
    """
    Creates a generic chain for generating a single document.
    This chain takes the entire history of the interaction as context.
    """
    logger.info(f"Creating document generation chain for: '{doc_name}'")
    
    # Updated system prompt to enforce using specific, consistent details.
    system_prompt = (
        "You are a solutions engineer responsible for creating sales and internal documents. "
        "Your task is to generate a specific document based on the provided context."
        "\n\n## CRITICAL INSTRUCTIONS:\n"
        "1. **Use Specific Details:** You MUST use the concrete names, numbers, dates, and other details provided in the `details` section of the context. Refer to it for the current date, contact persons, pricing, company names, etc.\n"
        "2. **No Placeholders:** Do NOT use placeholders like '[Insert Date]', '[Insert Name]', '[Contact Person]', or '$X,XXX'. Fill in all values using the provided context details.\n"
        "3. **Be Consistent:** The details are provided to ensure consistency across all documents. Use them exactly as given.\n"
        "4. **Be Professional:** Your tone should be professional, clear, and detailed, appropriate for a B2B sales context."
        "\n\n## Document to Create:\n"
        "**Document Name:** {doc_name}\n"
        "**Description:** {doc_description}\n\n"
        "## Full Context for Generation:\n{context}"
    )

    # Append the critical instruction to the system prompt
    final_system_prompt = system_prompt + (
        "\n\nCRITICAL: Return ONLY the document content. Do not include any introductory text, "
        "meta-commentary, or explanations. Start directly with the document content."
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", final_system_prompt),
        ("human", "Now, please generate the content for the '{doc_name}' document.")
    ])

    return prompt | llm | StrOutputParser()

def sanitize_filename(name: str) -> str:
    """Sanitizes a string to be a valid filename."""
    s = name.strip().replace(" ", "_").replace("/", "_")
    s = "".join(c for c in s if c.isalnum() or c in ("_", "-"))
    return s.lower()

def load_document_definitions_from_csv(file_path: str) -> List[Dict[str, str]]:
    """Loads document definitions from the specified CSV file."""
    logger.info(f"Loading document definitions from {file_path}")
    doc_defs = []
    try:
        with open(file_path, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Using 'Document Name' and 'Purpose' from the CSV header
                doc_defs.append({"name": row["Document Name"], "desc": row["Purpose"]})
        logger.info(f"Successfully loaded {len(doc_defs)} document definitions.")
        return doc_defs
    except FileNotFoundError:
        logger.error(f"Error: The file {file_path} was not found.")
        return []
    except Exception as e:
        logger.error(f"An error occurred while reading the CSV file: {e}")
        return []

def generate_documents_sequentially(scenario: Dict[str, Any]):
    """
    Generates a sequence of documents, feeding the context from one to the next.
    """
    logger.info("Starting sequential document generation process.")
    fake = Faker()

    # Create a unique output directory for this run using a timestamp.
    run_timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    output_dir = Path("mock/sales_docs/generated_documents") / run_timestamp
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Saving generated documents to: {output_dir}")
    except OSError as e:
        logger.error(f"Failed to create output directory {output_dir}: {e}")
        return

    # Load document definitions from the CSV file.
    document_definitions = load_document_definitions_from_csv('mock/sales_docs/document_types.csv')

    if not document_definitions:
        logger.error("No document definitions loaded. Aborting generation.")
        return

    # Add vendor and prospect summary documents to the beginning of the list.
    summary_docs = [
        {"name": "Vendor Summary", "desc": "A summary document outlining the vendor's company profile, its flagship solution, key features, and ideal customer profile."},
        {"name": "Prospect Summary", "desc": "A summary document outlining the prospect's company profile, industry, and specific business pain points."}
    ]
    document_definitions = summary_docs + document_definitions
    logger.info("Added custom vendor and prospect summary documents to the generation queue.")

    # The incoming data from the LLM can be unpredictable. It might be the schema
    # definition (with data in 'properties') or nested under a 'scenario' key.
    # This block attempts to normalize the data into the expected structure.
    logger.info("Normalizing raw scenario data from LLM.")
    processed_scenario = scenario.get('properties', scenario)
    actual_scenario = processed_scenario.get('scenario', processed_scenario)

    # Validate that the normalization resulted in the expected structure.
    if not isinstance(actual_scenario, dict) or 'vendor' not in actual_scenario or 'prospect' not in actual_scenario:
        logger.error("Normalization failed. Scenario data is missing required 'vendor' or 'prospect' keys.")
        logger.error(f"Original data received: {scenario}")
        logger.error(f"Data after normalization attempt: {actual_scenario}")
        raise ValueError("Invalid scenario data structure received from LLM that could not be normalized.")

    # Further normalize vendor and prospect data, as they might also be schemas.
    if isinstance(actual_scenario.get('vendor'), dict) and 'properties' in actual_scenario['vendor']:
        logger.info("Found nested 'properties' in vendor data, normalizing.")
        actual_scenario['vendor'] = actual_scenario['vendor']['properties']
    
    if isinstance(actual_scenario.get('prospect'), dict) and 'properties' in actual_scenario['prospect']:
        logger.info("Found nested 'properties' in prospect data, normalizing.")
        actual_scenario['prospect'] = actual_scenario['prospect']['properties']

    logger.debug(f"Normalized scenario data successfully. Vendor: {actual_scenario.get('vendor', {}).get('name')}")

    # Generate consistent, dynamic details for this run to be used across all docs.
    dynamic_details = {
        "current_date": datetime.datetime.now().strftime("%B %d, %Y"),
        "vendor_contact": {
            "name": fake.name(),
            "email": fake.email(),
            "title": "Senior Solutions Engineer"
        },
        "prospect_contact": {
            "name": fake.name(),
            "email": fake.email(),
            "title": "Director of Operations"
        },
        "project_team": {
            "project_manager": {"name": fake.name(), "email": fake.email()},
            "technical_lead": {"name": fake.name(), "email": fake.email()},
            "integration_specialist": {"name": fake.name(), "email": fake.email()}
        },
        "support_contact": {
            "name": fake.name(),
            "email": f"support@{actual_scenario['vendor']['name'].lower().replace(' ', '').split(',')[0]}.com",
            "phone": fake.phone_number()
        },
        "pricing": {
            "license_per_user_per_month": random.randint(50, 250),
            "number_of_users": random.randint(20, 200),
            "implementation_fee": random.randint(5000, 50000),
            "support_tier": random.choice(["Standard", "Premium", "Enterprise"]),
            "discount_percentage": random.randint(5, 20)
        },
        "timeline": {
            "poc_weeks": 2,
            "implementation_weeks": random.randint(6, 16)
        },
        "competitor": {
            "name": fake.company() + " " + random.choice(["Solutions", "Dynamics", "Innovations", "Tech"])
        }
    }
    logger.info(f"Generated dynamic details for this run: {dynamic_details}")

    # Initialize the context with the scenario details
    context = {"scenario": actual_scenario, "documents": {}}
    logger.debug("Initialized context with scenario and empty documents dict.")

    print("="*80)
    print("GENERATING MOCK SALES DOCUMENTS")
    print("="*80)
    logger.info(f"Using Vendor: {actual_scenario.get('vendor')}")
    logger.info(f"Using Prospect: {actual_scenario.get('prospect')}")
    print(f"Vendor: {actual_scenario['vendor']['name']} ({actual_scenario['vendor']['solution_name']})")
    print(f"Prospect: {actual_scenario['prospect']['name']} ({actual_scenario['prospect']['industry']})")
    print("-" * 80 + "\n")


    for doc_def in document_definitions:
        doc_name = doc_def['name']
        doc_desc = doc_def['desc']

        logger.info(f"Preparing to generate document: '{doc_name}'")
        # Create a chain for the current document
        chain = get_document_generation_chain(doc_name, doc_desc)

        # To avoid overflowing the context window, we create a compact version of the
        # context for the LLM, including the scenario, previous document titles,
        # and the full text of only the most recent document.
        compacted_context = {
            "scenario": context["scenario"],
            "details": dynamic_details,
            "generated_document_titles": list(context["documents"].keys())
        }
        if context["documents"]:
            last_doc_title = list(context["documents"].keys())[-1]
            compacted_context["most_recent_document"] = {
                "title": last_doc_title,
                "content": context["documents"][last_doc_title]
            }

        try:
            # Invoke the chain with the current compacted context
            logger.debug(f"Invoking generation chain for '{doc_name}'.")
            generated_content = chain.invoke({
                "doc_name": doc_name,
                "doc_description": doc_desc,
                "context": compacted_context
            })
            logger.info(f"Successfully generated document: '{doc_name}'.")

            # Update the full context with the newly generated document
            context["documents"][doc_name] = generated_content
            logger.debug(f"Context updated with new document: '{doc_name}'.")

            # Print the output
            print(f"## 📄 Document Generated: {doc_name}\n")
            print(generated_content)
            print("\n" + "-"*80 + "\n")

            # Save the document to a file in the run-specific directory.
            # The files are numbered to preserve generation order.
            file_number = len(context["documents"])
            safe_filename = sanitize_filename(doc_name)
            output_filename = f"{file_number:02d}_{safe_filename}.md"
            output_path = output_dir / output_filename

            try:
                with output_path.open("w", encoding="utf-8") as f:
                    f.write(f"# {doc_name}\n\n{generated_content}")
                logger.info(f"Successfully saved document to: {output_path}")
            except IOError as e:
                logger.error(f"Failed to write document to file {output_path}: {e}")

        except Exception as e:
            logger.error(f"Error generating document '{doc_name}': {e}", exc_info=True)
            continue # Move to the next document

    logger.info("Finished sequential document generation.")

# --- 5. Main Execution Block ---
if __name__ == "__main__":
    logger.info("Script execution started.")
    try:
        # Define a list of potential sales topics to be chosen from randomly.
        sales_topics = [
            "AI-powered cybersecurity threat detection for financial institutions",
            "Cloud-based project management and collaboration for remote teams",
            "Automated financial compliance and reporting software for enterprises",
            "CRM with integrated marketing automation for small to medium businesses",
            "Healthcare data analytics platform for improving patient outcomes",
            "HR software for streamlining employee onboarding and performance tracking",
            "E-commerce platform with a personalized recommendation engine",
            "IoT platform for predictive maintenance in smart factories",
            "Legal tech for AI-driven contract lifecycle management",
            "Customer support software with integrated AI-powered chatbots",
            "DevOps automation and continuous integration (CI/CD) platform",
            "Sustainable energy management and reporting for commercial real estate",
            "Digital asset management (DAM) for global marketing teams",
            "Virtual event and webinar platform with advanced analytics",
            "API management and integration platform-as-a-service (iPaaS)"
        ]

        # Randomly select a sales topic for this run
        sales_topic = random.choice(sales_topics)
        logger.info(f"Using randomly selected sales topic: '{sales_topic}'")

        # Generate the vendor and prospect scenario
        logger.info("Requesting scenario generation from LLM.")
        scenario_generator = get_scenario_generator_chain()
        scenario_data = scenario_generator.invoke({"topic": sales_topic, "schema": Scenario.schema_json()})
        logger.info("Scenario data received from LLM.")
        logger.debug(f"Received scenario data: {scenario_data}")

        # Generate all the documents in sequence
        generate_documents_sequentially(scenario_data)

    except Exception as e:
        logger.critical(f"A critical error occurred in the main execution block: {e}", exc_info=True)
    finally:
        logger.info("Script execution finished.")
