#!/usr/bin/env python3
"""
Test script for the enhanced agent with personas
"""
import asyncio
import sys
from pathlib import Path

# Add the agent directory to the path
sys.path.append(str(Path(__file__).parent))

from agent import graph
from state import initialize_state

async def test_enhanced_agent():
    """Test the enhanced agent with personas"""
    
    # Create test input
    initial_state = initialize_state(
        task="Create a comprehensive cloud migration proposal for our e-commerce platform. We need to move from on-premises servers to AWS, ensuring zero downtime and improved scalability. Budget is around $500k for the first year.",
        account_data={
            "name": "TechStyle Fashion",
            "id": "test-account-123",
            "contact": "Sarah Chen, VP of Engineering",
            "stage": "Evaluation",
            "value": "$500,000",
            "industry": "retail"  # This will trigger retail-specific adjustments
        },
        document_id="test-doc-enhanced-001",
        user_id="test-user-123"
    )
    
    print("🚀 Testing Enhanced Agent with Personas")
    print("=" * 50)
    print(f"Client: {initial_state['account_data']['name']}")
    print(f"Stage: {initial_state['account_data']['stage']}")
    print(f"Task: {initial_state['task'][:100]}...")
    print("=" * 50)
    
    # Run the agent
    start_time = asyncio.get_event_loop().time()
    result = await graph.ainvoke(initial_state)
    end_time = asyncio.get_event_loop().time()
    
    # Display results
    print("\n✅ Agent Completed!")
    print(f"⏱️  Total Time: {end_time - start_time:.2f} seconds")
    print(f"📊 Stages Completed: {', '.join(result.get('completed_stages', []))}")
    print(f"🎯 Quality Score: {result.get('overall_quality_score', 0):.2f}")
    
    # Show stage timings
    if result.get('stage_timings'):
        print("\n⚡ Stage Performance:")
        for stage, duration in result['stage_timings'].items():
            print(f"  - {stage}: {duration:.2f}s")
    
    # Show any errors
    if result.get('errors'):
        print("\n❌ Errors:")
        for error in result['errors']:
            print(f"  - {error}")
    
    # Show document preview
    print("\n📄 Document Preview:")
    print("-" * 50)
    content = result.get('document_content', '')
    print(content[:1500] + "..." if len(content) > 1500 else content)
    
    # Show validation insights
    if result.get('validation_results'):
        print("\n🔍 Validation Insights:")
        val = result['validation_results']
        print(f"  - Completeness: {val.get('completeness_score', 0):.2f}")
        if val.get('strategic_effectiveness'):
            print(f"  - Strategic Effectiveness: {val.get('strategic_effectiveness', 0):.2f}")
        if val.get('competitive_advantage'):
            print(f"  - Competitive Advantage: {val.get('competitive_advantage', 'N/A')}")
    
    # Save full document
    with open('test_output_enhanced.md', 'w') as f:
        f.write(result.get('document_content', ''))
    print("\n💾 Full document saved to: test_output_enhanced.md")

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the test
    asyncio.run(test_enhanced_agent())