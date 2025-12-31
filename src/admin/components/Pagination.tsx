/**
 * 페이징 컴포넌트
 * 기존 index.html의 renderPagination 함수를 React 컴포넌트로 구현
 */

import React from 'react';
import { Pagination as PaginationType } from '../types';

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) return null;

  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  return (
    <div className="pagination">
      <div className="pagination-container">
        {/* 이전 버튼 */}
        {page > 1 ? (
          <button
            className="pagination-btn"
            onClick={() => onPageChange(page - 1)}
          >
            ‹ Предыдущая
          </button>
        ) : (
          <button className="pagination-btn disabled" disabled>
            ‹ Предыдущая
          </button>
        )}

        {/* 페이지 번호 */}
        <div className="pagination-pages">
          {startPage > 1 && (
            <>
              <button
                className="pagination-page"
                onClick={() => onPageChange(1)}
              >
                1
              </button>
              {startPage > 2 && <span className="pagination-ellipsis">...</span>}
            </>
          )}

          {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
            const pageNum = startPage + i;
            return (
              <button
                key={pageNum}
                className={`pagination-page ${pageNum === page ? 'active' : ''}`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <span className="pagination-ellipsis">...</span>
              )}
              <button
                className="pagination-page"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* 다음 버튼 */}
        {page < totalPages ? (
          <button
            className="pagination-btn"
            onClick={() => onPageChange(page + 1)}
          >
            Следующая ›
          </button>
        ) : (
          <button className="pagination-btn disabled" disabled>
            Следующая ›
          </button>
        )}

        {/* 정보 표시 */}
        <div className="pagination-info">
          Страница {page} из {totalPages} (Всего: {total})
        </div>
      </div>
    </div>
  );
};

export default Pagination;

