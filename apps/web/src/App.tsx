import { useState, useEffect } from 'react';
import type { Document } from '@ai-document-vault/shared';
import { DocumentUpload } from './components/DocumentUpload';
import { DocumentList } from './components/DocumentList';
import { GroupSidebar } from './components/GroupSidebar';
import { AIGroupSuggestions } from './components/AIGroupSuggestions';
import { SearchAndFilter } from './components/SearchAndFilter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ApiClientError } from './lib/api/client';
import { getDocuments } from './lib/api/client';
import { getGroupDocuments } from './lib/api/groups';
import { searchDocuments } from './lib/api/search';
import type { SearchParams } from './lib/api/search';

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDocuments, setGroupDocuments] = useState<Document[]>([]);
  const [isLoadingGroupDocuments, setIsLoadingGroupDocuments] = useState(false);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  /**
   * Load existing documents from database on mount
   * 
   * Explicit error handling: Log and display errors to user.
   */
  useEffect(() => {
    async function loadDocuments() {
      try {
        setIsLoadingDocuments(true);
        setLoadError(null);
        const docs = await getDocuments(false) as Document[];
        setDocuments(docs);
      } catch (error) {
        console.error('[App] Failed to load documents:', error);
        const errorMessage = error instanceof ApiClientError
          ? error.message
          : 'Failed to load documents. Please refresh the page.';
        setLoadError(errorMessage);
      } finally {
        setIsLoadingDocuments(false);
      }
    }

    loadDocuments();
  }, []);

  /**
   * Handle search/filter changes
   */
  useEffect(() => {
    async function performSearch() {
      // If no search params, use regular document list
      const hasSearchParams = searchParams.query || searchParams.status || searchParams.groupId;
      
      if (!hasSearchParams && !selectedGroupId) {
        // No search/filter, load all documents
        try {
          setIsLoadingDocuments(true);
          const docs = await getDocuments(false) as Document[];
          setDocuments(docs);
        } catch (error) {
          console.error('Failed to load documents:', error);
        } finally {
          setIsLoadingDocuments(false);
        }
        return;
      }

      // Perform search
      setIsSearching(true);
      setSearchError(null);
      try {
        const searchParamsWithGroup = { ...searchParams };
        // If viewing a group, include it in search params
        if (selectedGroupId) {
          searchParamsWithGroup.groupId = selectedGroupId;
        }

        const results = await searchDocuments(searchParamsWithGroup);
        
        if (selectedGroupId) {
          setGroupDocuments(results);
        } else {
          setDocuments(results);
        }
      } catch (error) {
        console.error('[App] Failed to search documents:', error);
        const errorMessage = error instanceof ApiClientError
          ? error.message
          : 'Search failed. Please try again.';
        setSearchError(errorMessage);
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [searchParams, selectedGroupId]);

  /**
   * Handle successful document upload
   * 
   * Adds the document to the list. Status will update via polling.
   */
  const handleUploadSuccess = (document: Document) => {
    // Add document to list - status will be updated via polling
    setDocuments((prev) => [document, ...prev]);
  };

  /**
   * Handle document update (from polling or retry)
   */
  const handleDocumentUpdate = (updatedDocument: Document) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === updatedDocument.id ? updatedDocument : doc))
    );
  };

  /**
   * Handle document deletion
   */
  const handleDocumentDelete = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    setGroupDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  /**
   * Handle group selection
   */
  const handleGroupSelect = async (groupId: string | null) => {
    setSelectedGroupId(groupId);

    if (groupId) {
      // Load documents for selected group
      setIsLoadingGroupDocuments(true);
      try {
        const docs = await getGroupDocuments(groupId);
        setGroupDocuments(docs);
      } catch (error) {
        console.error('Failed to load group documents:', error);
        setGroupDocuments([]);
      } finally {
        setIsLoadingGroupDocuments(false);
      }
    } else {
      // Show all documents
      setGroupDocuments([]);
    }
  };

  /**
   * Handle group changes (refresh documents)
   */
  const handleGroupChange = async () => {
    if (selectedGroupId) {
      // Reload group documents
      setIsLoadingGroupDocuments(true);
      try {
        const docs = await getGroupDocuments(selectedGroupId);
        setGroupDocuments(docs);
      } catch (error) {
        console.error('Failed to reload group documents:', error);
      } finally {
        setIsLoadingGroupDocuments(false);
      }
    }
  };

  /**
   * Handle upload errors
   * 
   * Logs errors for debugging. User feedback is handled by DocumentUpload component.
   */
  const handleUploadError = (error: ApiClientError) => {
    console.error('Document upload failed:', error);
    // Error is already displayed in DocumentUpload component
  };

  // Determine which documents to show
  // When viewing a group, show groupDocuments; otherwise show all documents
  const displayedDocuments = selectedGroupId ? groupDocuments : documents;
  const isLoading = selectedGroupId 
    ? (isLoadingGroupDocuments || isSearching)
    : (isLoadingDocuments || isSearching);

  /**
   * Handle group membership changes (when document is added/removed from group)
   * This refreshes the group view if viewing a group, but doesn't affect the main documents list
   */
  const handleGroupMembershipChange = () => {
    // Only refresh if we're currently viewing a group
    if (selectedGroupId) {
      handleGroupChange();
    }
    // Don't touch the main documents list - documents are still there, just group membership changed
  };

  /**
   * Handle remove document from current group
   */
  const handleRemoveFromGroup = async (documentId: string) => {
    if (!selectedGroupId) return;

    try {
      const { removeDocumentFromGroup } = await import('./lib/api/groups');
      await removeDocumentFromGroup(selectedGroupId, documentId);
      // Refresh group documents to reflect the removal
      handleGroupChange();
    } catch (error) {
      console.error('Failed to remove document from group:', error);
      throw error; // Let DocumentItem handle the error display
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar */}
        <GroupSidebar
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleGroupSelect}
          onGroupChange={handleGroupChange}
          refreshTrigger={sidebarRefreshTrigger}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 py-6 px-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">AI Document Vault</h1>
            <p className="text-sm text-slate-500">
              Upload documents for AI processing and analysis
            </p>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto py-6 px-6 flex flex-col gap-8">
            {/* Upload section */}
            <section>
              <DocumentUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </section>

            {/* AI Suggestions */}
            {!selectedGroupId && (
              <section>
                <AIGroupSuggestions
                  onSuggestionAccepted={() => {
                    // Trigger sidebar refresh to show new group
                    setSidebarRefreshTrigger((prev) => prev + 1);
                    handleGroupChange();
                  }}
                />
              </section>
            )}

            {/* Search and Filter */}
            <section>
              <SearchAndFilter
                onSearchChange={setSearchParams}
                currentGroupId={selectedGroupId}
              />
              {searchError && (
                <ErrorDisplay
                  error={searchError}
                  title="Search Error"
                  onDismiss={() => setSearchError(null)}
                  onRetry={() => {
                    setSearchError(null);
                    // Trigger search again by updating params
                    setSearchParams({ ...searchParams });
                  }}
                  className="mt-4"
                />
              )}
            </section>

            {/* Documents section */}
            <section>
              {loadError && !isLoading && (
                <ErrorDisplay
                  error={loadError}
                  title="Failed to Load Documents"
                  onRetry={() => {
                    setLoadError(null);
                    // Reload documents
                    const loadDocs = async () => {
                      try {
                        setIsLoadingDocuments(true);
                        const docs = await getDocuments(false) as Document[];
                        setDocuments(docs);
                      } catch (error) {
                        const errorMessage = error instanceof ApiClientError
                          ? error.message
                          : 'Failed to load documents. Please refresh the page.';
                        setLoadError(errorMessage);
                      } finally {
                        setIsLoadingDocuments(false);
                      }
                    };
                    loadDocs();
                  }}
                  className="mb-6"
                />
              )}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">
                    {isSearching ? 'Searching documents...' : 'Loading documents...'}
                  </p>
                </div>
              ) : (
                <DocumentList 
                  documents={displayedDocuments} 
                  onDocumentUpdate={handleDocumentUpdate}
                  onDocumentDelete={handleDocumentDelete}
                  onGroupsChange={handleGroupMembershipChange}
                  currentGroupId={selectedGroupId}
                  onRemoveFromGroup={handleRemoveFromGroup}
                />
              )}
            </section>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
