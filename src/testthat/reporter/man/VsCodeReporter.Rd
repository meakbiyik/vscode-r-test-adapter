% Generated by roxygen2: do not edit by hand
% Please edit documentation in R/reporter-vscode.R
\name{VSCodeReporter}
\alias{VSCodeReporter}
\title{Test reporter: VS Code format.}
\description{
This reporter will output results in a format understood by the
\href{https://github.com/meakbiyik/vscode-r-test-adapter}{R Test Explorer}.
}
\section{Super class}{
\code{\link[testthat:Reporter]{testthat::Reporter}} -> \code{VSCodeReporter}
}
\section{Methods}{
\subsection{Public methods}{
\itemize{
\item \href{#method-new}{\code{VSCodeReporter$new()}}
\item \href{#method-start_reporter}{\code{VSCodeReporter$start_reporter()}}
\item \href{#method-start_file}{\code{VSCodeReporter$start_file()}}
\item \href{#method-start_test}{\code{VSCodeReporter$start_test()}}
\item \href{#method-add_result}{\code{VSCodeReporter$add_result()}}
\item \href{#method-end_test}{\code{VSCodeReporter$end_test()}}
\item \href{#method-end_file}{\code{VSCodeReporter$end_file()}}
\item \href{#method-end_reporter}{\code{VSCodeReporter$end_reporter()}}
\item \href{#method-cat_json}{\code{VSCodeReporter$cat_json()}}
\item \href{#method-clone}{\code{VSCodeReporter$clone()}}
}
}
\if{html}{
\out{<details ><summary>Inherited methods</summary>}
\itemize{
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id=".start_context">}\href{../../testthat/html/Reporter.html#method-.start_context}{\code{testthat::Reporter$.start_context()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="cat_line">}\href{../../testthat/html/Reporter.html#method-cat_line}{\code{testthat::Reporter$cat_line()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="cat_tight">}\href{../../testthat/html/Reporter.html#method-cat_tight}{\code{testthat::Reporter$cat_tight()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="end_context">}\href{../../testthat/html/Reporter.html#method-end_context}{\code{testthat::Reporter$end_context()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="end_context_if_started">}\href{../../testthat/html/Reporter.html#method-end_context_if_started}{\code{testthat::Reporter$end_context_if_started()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="is_full">}\href{../../testthat/html/Reporter.html#method-is_full}{\code{testthat::Reporter$is_full()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="local_user_output">}\href{../../testthat/html/Reporter.html#method-local_user_output}{\code{testthat::Reporter$local_user_output()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="rule">}\href{../../testthat/html/Reporter.html#method-rule}{\code{testthat::Reporter$rule()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="start_context">}\href{../../testthat/html/Reporter.html#method-start_context}{\code{testthat::Reporter$start_context()}}\out{</span>}
\item \out{<span class="pkg-link" data-pkg="testthat" data-topic="Reporter" data-id="update">}\href{../../testthat/html/Reporter.html#method-update}{\code{testthat::Reporter$update()}}\out{</span>}
}
\out{</details>}
}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-new"></a>}}
\if{latex}{\out{\hypertarget{method-new}{}}}
\subsection{Method \code{new()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$new(suite_name, ...)}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-start_reporter"></a>}}
\if{latex}{\out{\hypertarget{method-start_reporter}{}}}
\subsection{Method \code{start_reporter()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$start_reporter()}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-start_file"></a>}}
\if{latex}{\out{\hypertarget{method-start_file}{}}}
\subsection{Method \code{start_file()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$start_file(filename)}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-start_test"></a>}}
\if{latex}{\out{\hypertarget{method-start_test}{}}}
\subsection{Method \code{start_test()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$start_test(context, test)}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-add_result"></a>}}
\if{latex}{\out{\hypertarget{method-add_result}{}}}
\subsection{Method \code{add_result()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$add_result(context, test, result)}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-end_test"></a>}}
\if{latex}{\out{\hypertarget{method-end_test}{}}}
\subsection{Method \code{end_test()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$end_test(context, test)}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-end_file"></a>}}
\if{latex}{\out{\hypertarget{method-end_file}{}}}
\subsection{Method \code{end_file()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$end_file()}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-end_reporter"></a>}}
\if{latex}{\out{\hypertarget{method-end_reporter}{}}}
\subsection{Method \code{end_reporter()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$end_reporter()}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-cat_json"></a>}}
\if{latex}{\out{\hypertarget{method-cat_json}{}}}
\subsection{Method \code{cat_json()}}{
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$cat_json(x)}\if{html}{\out{</div>}}
}

}
\if{html}{\out{<hr>}}
\if{html}{\out{<a id="method-clone"></a>}}
\if{latex}{\out{\hypertarget{method-clone}{}}}
\subsection{Method \code{clone()}}{
The objects of this class are cloneable with this method.
\subsection{Usage}{
\if{html}{\out{<div class="r">}}\preformatted{VSCodeReporter$clone(deep = FALSE)}\if{html}{\out{</div>}}
}

\subsection{Arguments}{
\if{html}{\out{<div class="arguments">}}
\describe{
\item{\code{deep}}{Whether to make a deep clone.}
}
\if{html}{\out{</div>}}
}
}
}
